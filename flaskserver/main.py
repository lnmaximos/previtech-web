from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sklearn.compose import make_column_transformer
from sklearn.preprocessing import OneHotEncoder, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import precision_score, recall_score
import pandas as pd
import pickle
import os

# Configuração do Flask
app = Flask(__name__)
CORS(app)

# Configuração do banco de dados SQLite
db_path = "sqlite:///previtech.db"
engine = create_engine(db_path, echo=False)
Session = sessionmaker(bind=engine)
session = Session()

def load_data_from_db():
    # Consulta SQL para obter os dados da tabela clientes
    query = "SELECT * FROM clientes"
    data = pd.read_sql(query, engine)

    # Remove a coluna 'id_cliente', que não é necessária para o modelo
    data = data.drop('id_cliente', axis=1)
    return data

def preprocess_data(data):
    # Separação da base de dados e da coluna churn
    x = data.drop('churn', axis=1)
    y = data['churn']
    
    # Tranformação das variáveis categóricas usando OneHotEncoder
    one_hot = make_column_transformer((OneHotEncoder(drop='if_binary'), ['sexo_biologico', 'pais', 'tem_cartao_credito', 'membro_ativo']), remainder='passthrough', sparse_threshold=0)
    columns = x.columns
    x = one_hot.fit_transform(x)
    one_hot.get_feature_names_out(columns)

    # Transformação da variável alvo usando LabelEncoder
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y)

    # Divisão da base de dados entre treino, validação e teste
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, stratify=y, random_state=5)
    x_train, x_val, y_train, y_val = train_test_split(x_train, y_train, stratify=y_train, random_state=5)

    return x_train, x_val, x_test, y_train, y_val, y_test, one_hot

def train_model(x_train, y_train):
    # Treinamento do modelo DecisionTreeClassifier
    tree_model = DecisionTreeClassifier(max_depth=8, random_state=5)
    tree_model.fit(x_train, y_train)
    return tree_model

def export_models(one_hot_encoder, tree_model):
    # Exporta os modelos treinados para arquivos pickle
    with open('onehot_model.pkl', 'wb') as file:
        pickle.dump(one_hot_encoder, file)

    with open('tree_model.pkl', 'wb') as file:
        pickle.dump(tree_model, file)

def load_models():
    # Carrega os modelos treinados a partir dos arquivos pickle
    with open('onehot_model.pkl', 'rb') as file:
        one_hot_encoder = pickle.load(file)

    with open('tree_model.pkl', 'rb') as file:
        tree_model = pickle.load(file)

    return one_hot_encoder, tree_model

def models_exist():
    # Verifica se os modelos treinados já existem
    return os.path.exists('onehot_model.pkl') and os.path.exists('tree_model.pkl')

def calculate_metrics(tree_model, x_test, y_test, x_val, y_val):
    # Calcula métricas de desempenho do modelo
    accuracy = round(tree_model.score(x_test, y_test) * 100, 1)
    precision = round(precision_score(y_val, tree_model.predict(x_val)) * 100, 1)
    recall = round(recall_score(y_val, tree_model.predict(x_val)) * 100, 1)

    return accuracy, precision, recall

def insert_data_to_sql(session, data_frame, one_hot_encoder, tree_model):
    # Realiza a predição do cliente cadastrado
    transformed_data = one_hot_encoder.transform(data_frame)
    prediction = tree_model.predict(transformed_data)

    # Obtém os dados originais do cliente
    original_data = data_frame.copy()
    new_customer_data = original_data.to_dict(orient='records')[0]
    prediction_for_db = prediction[0] if isinstance(prediction, list) else prediction

    # Insere na tabela novos_clientes do banco de dados
    session.execute(text("""
        INSERT INTO novos_clientes (score_credito, pais, sexo_biologico, idade, anos_de_cliente, saldo,
                                    servicos_adquiridos, tem_cartao_credito, membro_ativo, salario_estimado, churn)
        VALUES (:score_credito, :pais, :sexo_biologico, :idade, :anos_de_cliente, :saldo,
                :servicos_adquiridos, :tem_cartao_credito, :membro_ativo, :salario_estimado, :churn)
    """), {
        'score_credito': new_customer_data['score_credito'],
        'pais': new_customer_data['pais'],
        'sexo_biologico': new_customer_data['sexo_biologico'],
        'idade': new_customer_data['idade'],
        'anos_de_cliente': new_customer_data['anos_de_cliente'],
        'saldo': new_customer_data['saldo'],
        'servicos_adquiridos': new_customer_data['servicos_adquiridos'],
        'tem_cartao_credito': new_customer_data['tem_cartao_credito'],
        'membro_ativo': new_customer_data['membro_ativo'],
        'salario_estimado': new_customer_data['salario_estimado'],
        'churn': int(prediction_for_db[0]),
    })

    # Commita a transação
    session.commit()

    return prediction

def generate_metrics_and_prediction(tree_model, x_test, y_test, x_val, y_val, prediction):
    # Gera as métricas e a predição para enviar como resposta
    accuracy, precision, recall = calculate_metrics(tree_model, x_test, y_test, x_val, y_val)

    metrics = {
        "acuracia": accuracy,
        "precisao": precision,
        "recall": recall,
    }

    if prediction[0] == 0:
        metrics.update({"predicao": "Não cancela o serviço"})
    else:
        metrics.update({"predicao": "Cancela o serviço"})

    return metrics

@app.route("/predict", methods=["POST"])
def predict():
    try:
        # Recebe os dados do cliente via requisição POST
        data = request.get_json()
        data_frame = pd.DataFrame(data)

        # Verifica se os modelos treinados já existem ou se é necessário treiná-los
        if models_exist():
            one_hot_encoder, tree_model = load_models()
            x_train, x_val, x_test, y_train, y_val, y_test, _ = preprocess_data(load_data_from_db())
        else:
            x_train, x_val, x_test, y_train, y_val, y_test, one_hot_encoder = preprocess_data(load_data_from_db())
            tree_model = train_model(x_train, y_train)
            export_models(one_hot_encoder, tree_model)

        # Realiza a predição do cliente cadastrado e insere na tabela do banco de dados
        prediction = insert_data_to_sql(session, data_frame, one_hot_encoder, tree_model)

        # Calcula métricas e gera a resposta
        metrics = generate_metrics_and_prediction(tree_model, x_test, y_test, x_val, y_val, prediction)

        # Retorna as métricas como resposta da API
        return jsonify(metrics), 200
    except Exception as e:
        # Trata exceções e retorna um erro 500 em caso de falha interna
        error_message = f"Internal server error: {str(e)}"
        return jsonify({"error": error_message}), 500

if __name__ == "__main__":
    # Executa a aplicação Flask em modo de depuração
    app.run(debug=True)
