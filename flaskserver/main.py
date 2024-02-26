from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy import create_engine, text, Column, String, Integer
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.sql import exists
from sklearn.compose import make_column_transformer
from sklearn.preprocessing import OneHotEncoder, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import precision_score, recall_score
from werkzeug.security import generate_password_hash, check_password_hash
from contextlib import contextmanager
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, verify_jwt_in_request
import pandas as pd
import pickle
import os

# Configuração do Flask
app = Flask(__name__)
CORS(app)

# Configuração do banco de dados PostgreSQL
db_user = os.environ.get("DB_USER")
db_password = os.environ.get("DB_PASSWORD")
db_host = os.environ.get("DB_HOST")
db_name = os.environ.get("DB_NAME")
db_path = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}/{db_name}"
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

def predict_and_insert_data_to_sql(session, data_frame, one_hot_encoder, tree_model, token_present):
    # Realiza a predição do cliente cadastrado
    transformed_data = one_hot_encoder.transform(data_frame)
    prediction = tree_model.predict(transformed_data)

    # Obtém os dados originais do cliente
    original_data = data_frame.copy()

    # Adiciona a coluna 'churn' de volta ao DataFrame original
    original_data['churn'] = prediction

    # Ajusta o campo churn conforme necessário
    original_data['churn'] = original_data['churn'].astype(int)

    if token_present:
        # Obtém o ID do usuário autenticado
        id_usuario = get_jwt_identity()

        session.execute(
            text("""
                INSERT INTO novos_clientes (score_credito, pais, sexo_biologico, idade, anos_de_cliente, saldo,
                                            servicos_adquiridos, tem_cartao_credito, membro_ativo, salario_estimado, churn, id_usuario)
                VALUES (:score_credito, :pais, :sexo_biologico, :idade, :anos_de_cliente, :saldo,
                        :servicos_adquiridos, :tem_cartao_credito, :membro_ativo, :salario_estimado, :churn, :id_usuario)
            """),
            {**original_data.iloc[0].to_dict(), 'id_usuario': id_usuario}
        )

        # Commita a transação
        session.commit()
    else:
        pass

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

@app.route("/get_user_clients", methods=["GET"])
@jwt_required()
def get_user_clients():
    try:
        # Obtém o id_usuario do token JWT atual
        id_usuario = get_jwt_identity()

        # Executa a consulta SQL para obter os novos clientes do usuário logado
        query = text("""
            SELECT * FROM novos_clientes 
            WHERE id_usuario = :id_usuario
            ORDER BY id_cliente DESC
            LIMIT 10
        """)
        result = session.execute(query, {"id_usuario": id_usuario}).fetchall()

        # Utiliza o Pandas para converter os resultados para um DataFrame
        df = pd.DataFrame(result)

        # Converte o DataFrame para JSON
        user_clients_json = df.to_json(orient="records")

        # Retorna os dados como JSON
        return user_clients_json, 200

    except Exception as e:
        # Trata exceções e retorna um erro 500 em caso de falha interna
        error_message = f"Internal server error: {str(e)}"
        return jsonify({"error": error_message}), 500

def predict_middleware():
    # Verifica se o token está presente na requisição
    token_present = "Authorization" in request.headers

    if token_present:
        # Se o token está presente, verifica-o
        verify_jwt_in_request()

    return token_present

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

        # Executa a função de middleware para verificar se o token está presente
        token_present = predict_middleware()

        # Realiza a predição do cliente cadastrado e insere na tabela do banco de dados
        prediction = predict_and_insert_data_to_sql(session, data_frame, one_hot_encoder, tree_model, token_present)

        # Calcula métricas e gera a resposta
        metrics = generate_metrics_and_prediction(tree_model, x_test, y_test, x_val, y_val, prediction)

        # Retorna as métricas como resposta da API
        return jsonify(metrics), 200
    except Exception as e:
        # Trata exceções e retorna um erro 500 em caso de falha interna
        error_message = f"Internal server error: {str(e)}"
        return jsonify({"error": error_message}), 500
    
Base = declarative_base()
    
class User(Base):
    __tablename__ = 'usuario'
    id_usuario = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)

@contextmanager
def get_session():
    session = Session()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        raise
    finally:
        session.close()

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
jwt = JWTManager(app)

def register_user(username, password):
    with get_session() as session:
        user_exists = session.query(exists().where(User.username == username)).scalar()
        if user_exists:
            raise ValueError("Este usuário já existe")

        hashed_password = generate_password_hash(password)
        new_user = User(username=username, password=hashed_password)
        session.add(new_user)

        session.commit()

        user_id = new_user.id_usuario

        access_token = create_access_token(identity=user_id)
        return access_token

def login_user(username, password):
    with get_session() as session:
        user = session.query(User).filter_by(username=username).first()
        if not user:
            raise ValueError("Usuário não encontrado")

        if not check_password_hash(user.password, password):
            raise ValueError("Senha incorreta")

        access_token = create_access_token(identity=user.id_usuario)
        return access_token

@app.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")
        access_token = register_user(username, password)
        return jsonify({"access_token": access_token, "message": "Usuário registrado com sucesso"}), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")
        access_token = login_user(username, password)
        return jsonify({"access_token": access_token, "message": "Login bem-sucedido"}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500