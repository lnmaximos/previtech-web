from flask import Flask, request
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

app = Flask(__name__)
CORS(app)

# Configuração da conexão com o banco de dados SQLite
db_path = "sqlite:///previtech.db"
engine = create_engine(db_path, echo=False)

# Criando uma instância da conexão com o banco de dados
Session = sessionmaker(bind=engine)
session = Session()

# Consulta SQL para obter os dados da tabela clientes
query = "SELECT * FROM clientes"

# Executa a consulta e obtém os resultados em um DataFrame
dados = pd.read_sql(query, engine)

# Remove a coluna 'id_cliente' do DataFrame
dados = dados.drop('id_cliente', axis=1)

# Separação da base de dados e da coluna churn, armazenando em uma variável x e a variável alvo em y
x = dados.drop('churn', axis=1)
y = dados['churn']

# Tranformação das variáveis categóricas
one_hot = make_column_transformer((OneHotEncoder(drop='if_binary'), ['sexo_biologico', 'pais', 'tem_cartao_credito', 'membro_ativo']), remainder='passthrough', sparse_threshold=0)
colunas = x.columns
x = one_hot.fit_transform(x)
one_hot.get_feature_names_out(colunas)

# Transformação da variável alvo
label_ecoder = LabelEncoder()
y = label_ecoder.fit_transform(y)

# Divisão da base de dados entre treino, teste e validação
x, x_teste, y, y_teste = train_test_split(x, y, test_size=0.2, stratify=y, random_state=5)
x_treino, x_val, y_treino, y_val = train_test_split(x, y, stratify=y, random_state=5)

# Treinando o modelo de machine learning
arvore = DecisionTreeClassifier(max_depth=8, random_state=5)
arvore.fit(x_treino, y_treino)
y_previsto = arvore.predict(x_val)

# Exportando o modelo
with open('modelo_onehot.pkl', 'wb') as arquivo:
    pickle.dump(one_hot, arquivo)

with open('modelo_arvore.pkl', 'wb') as arquivo:
    pickle.dump(arvore, arquivo)

@app.route("/predict", methods=["POST"])
def predict():
    # Testando o modelo
    acuracia = round(arvore.score(x_teste, y_teste)*100, 1)
    precisao = round(precision_score(y_val, y_previsto)*100, 1)
    recall = round(recall_score(y_val, y_previsto)*100, 1)

    data = request.get_json()

    # Converte os dados de entrada em um DataFrame
    data_frame = pd.DataFrame(data)

    modelo_one_hot = pd.read_pickle('modelo_onehot.pkl')
    modelo_arvore = pd.read_pickle('modelo_arvore.pkl')

    # Realiza a previsão
    novo_dado_transformado = modelo_one_hot.transform(data_frame)
    previsao = modelo_arvore.predict(novo_dado_transformado)
    print('Previsão do modelo =', previsao)

    # Obtendo os dados originais do cliente
    dados_cliente = data_frame.copy()

    # Convertendo os dados para um dicionário
    novo_cliente_data = dados_cliente.to_dict(orient='records')[0]

    # Convertendo o valor de 'previsao' para um tipo aceito pelo banco de dados
    previsao_para_bd = previsao[0] if isinstance(previsao, list) else previsao

    # Inserindo na tabela novos_clientes
    session.execute(text("""
        INSERT INTO novos_clientes (score_credito, pais, sexo_biologico, idade, anos_de_cliente, saldo,
                                    servicos_adquiridos, tem_cartao_credito, membro_ativo, salario_estimado, churn)
        VALUES (:score_credito, :pais, :sexo_biologico, :idade, :anos_de_cliente, :saldo,
                :servicos_adquiridos, :tem_cartao_credito, :membro_ativo, :salario_estimado, :churn)
    """), {
        'score_credito': novo_cliente_data['score_credito'],
        'pais': novo_cliente_data['pais'],
        'sexo_biologico': novo_cliente_data['sexo_biologico'],
        'idade': novo_cliente_data['idade'],
        'anos_de_cliente': novo_cliente_data['anos_de_cliente'],
        'saldo': novo_cliente_data['saldo'],
        'servicos_adquiridos': novo_cliente_data['servicos_adquiridos'],
        'tem_cartao_credito': novo_cliente_data['tem_cartao_credito'],
        'membro_ativo': novo_cliente_data['membro_ativo'],
        'salario_estimado': novo_cliente_data['salario_estimado'],
        'churn': int(previsao_para_bd),
    })

    # Commitando a transação
    session.commit()

    metricas = {
        "acuracia": acuracia,
        "precisao": precisao,
        "recall": recall,
    }

    if (previsao == [0]):
        metricas.update({"predicao": "Não cancela o serviço"})
        return metricas
    else:
        metricas.update({"predicao": "Cancela o serviço"})
        return metricas

@app.route("/hello")
def hello():
    return "Hello, World!"

@app.route("/")
def bemvindo():
    return "Bem vindo!"

if __name__ == "__main__":
    app.run(debug=True)
