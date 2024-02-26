let login = false;
let hasPredicted = false;

function checkLogin() {
  if (localStorage.getItem('authToken')) {
    document.querySelector('.userInfo').textContent = 'Sair';
    login = true;
    updateClientHistoryTable()
    document.getElementById("rightArrowForm").classList.remove("hide");
  }
}

checkLogin();

const form = document.querySelector(".form");

function validateInputs() {
  let isValid = true;

  const idade = form.elements["idade"];
  if (!idade.value.match(/^\d+$/) || parseInt(idade.value) < 16 || parseInt(idade.value) > 120) {
    addBorder(idade);
    isValid = false;
  }

  const sexo_biologico = document.getElementById("sexo_biologico").innerText;
  if (sexo_biologico === "Sexo") {
    document.getElementById("sexo-border").style.border = "1px solid rgba(255, 0, 0, 0.4)";
    isValid = false;
  }

  const pais = document.getElementById("pais").innerText;
  if (pais === "País") {
    document.getElementById("pais-border").style.border = "1px solid rgba(255, 0, 0, 0.4)";
    isValid = false;
  }

  const score_credito = form.elements["score_credito"];
  if (!score_credito.value.match(/^\d+$/) || parseFloat(score_credito.value) < 0 || parseFloat(score_credito.value) > 1000) {
    addBorder(score_credito);
    isValid = false;
  }

  const anos_de_cliente = form.elements["anos_de_cliente"];
  if (!anos_de_cliente.value.match(/^\d+$/) || parseInt(anos_de_cliente.value) < 0 || parseInt(anos_de_cliente.value) > 100) {
    addBorder(anos_de_cliente);
    isValid = false;
  }

  const servicos_adquiridos = form.elements["servicos_adquiridos"];
  if (!servicos_adquiridos.value.match(/^\d+$/) || parseInt(servicos_adquiridos.value) < 0 || parseInt(servicos_adquiridos.value) > 10) {
    addBorder(servicos_adquiridos);
    isValid = false;
  }

  const salario_estimado = form.elements["salario_estimado"];
  if (salario_estimado.value === "" || !salario_estimado.value.match(/^\d*([\.,]?\d{0,2})?$/) || parseFloat(salario_estimado.value) < 0 || parseFloat(salario_estimado.value) > 10000000) {
    addBorder(salario_estimado);
    isValid = false;
  }

  const saldo = form.elements["saldo"];
  if (saldo.value === "" || !saldo.value.match(/^[-+]?\d*([.,]?\d{1,2})?$/) || parseFloat(saldo.value) < -10000000 || parseFloat(saldo.value) > 1000000000) {
    addBorder(saldo);
    isValid = false;
  }

  return isValid;
}

function updateClientHistoryTable() {
  fetch("https://previtech-a544a1393ecd.herokuapp.com/get_user_clients", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem('authToken')}`
    }
  })
    .then(response => response.json())
    .then(data => {
        populateTable(data);
    })
    .catch(error => {
      console.error("Erro ao obter histórico de clientes:", error);
    });
}

function populateTable(clientData) {
  const tbody = document.querySelector('tbody');

  tbody.innerHTML = '';

  clientData.forEach(client => {
    const row = document.createElement('tr');
    const columns = ['score_credito', 'pais', 'sexo_biologico', 'idade', 'anos_de_cliente', 'saldo', 'servicos_adquiridos', 'tem_cartao_credito', 'membro_ativo', 'salario_estimado', 'churn'];

    columns.forEach(column => {
      const cell = document.createElement('td');
      cell.textContent = client[column];
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });
}

form.addEventListener("submit", function (event) {
  event.preventDefault();

  if (!validateInputs()) {
    return;
  }

  const headers = {
    "Content-Type": "application/json"
  };

  const authToken = localStorage.getItem('authToken');

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const formData = {
    "score_credito": [this.elements["score_credito"].value],
    "pais": [document.getElementById("pais").innerText],
    "sexo_biologico": [document.getElementById("sexo_biologico").innerText],
    "idade": [this.elements["idade"].value],
    "anos_de_cliente": [this.elements["anos_de_cliente"].value],
    "saldo": [this.elements["saldo"].value],
    "servicos_adquiridos": [this.elements["servicos_adquiridos"].value],
    "tem_cartao_credito": [this.elements["tem_cartao_credito"].checked ? 1 : 0],
    "membro_ativo": [this.elements["membro_ativo"].checked ? 1 : 0],
    "salario_estimado": [this.elements["salario_estimado"].value],
  };

  fetch("https://previtech-a544a1393ecd.herokuapp.com/predict", {
    method: "POST",
    body: JSON.stringify(formData),
    headers: headers
  })
    .then(response => response.json())
    .then(data => {
      console.log(data);

      const acuracia = data.acuracia;
      const precisao = data.precisao;
      const recall = data.recall;
      const predicao = data.predicao;

      document.getElementById("acuracia").textContent = `Acurácia: ${acuracia}`;
      document.getElementById("precisao").textContent = `Precisão: ${precisao}`;
      document.getElementById("recall").textContent = `Recall: ${recall}`;
      document.getElementById("predicao").textContent = `Predição: ${predicao}`;

      form.classList.toggle("hide");
      document.querySelector(".results").classList.toggle("hide");
      hasPredicted = true;
      if (localStorage.getItem('authToken')) {
        document.getElementById("rightArrowResults").classList.remove("hide");
      }
    })
    .catch(error => {
      console.error("Erro ao enviar requisição:", error);
      alert("Erro:", error);
    });
});

document.querySelector('.userInfo').addEventListener('click', function () {
  if (localStorage.getItem('authToken')) {
    localStorage.removeItem('authToken');
    location.reload();
  } else {
    window.open("auth.html", "_self");
  }
});