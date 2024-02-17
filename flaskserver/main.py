from flask import Flask, request
import pandas as pd
from sklearn.compose import make_column_transformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import precision_score, recall_score
import pickle
from flask_cors import CORS
app = Flask(__name__)
CORS(app)

# Importando os dados e excluindo a coluna id_cliente
dados = pd.read_csv('churn.csv')
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

    # Converte os dados de entrada em um array numpy
    data_frame = pd.DataFrame(data)

    modelo_one_hot = pd.read_pickle('modelo_onehot.pkl')
    modelo_arvore = pd.read_pickle('modelo_arvore.pkl')
    # Realiza a previsão
    novo_dado_transformado = modelo_one_hot.transform(data_frame)
    previsao = modelo_arvore.predict(novo_dado_transformado)
    print('previsao do modelo =', previsao)

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
