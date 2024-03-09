const form = document.querySelector(".form");
let login = false;
let hasPredicted = false;

function checkLogin() {
  if (localStorage.getItem('authToken')) {
    document.querySelector('.userInfo').textContent = 'Sair';
    login = true;
    document.getElementById("rightArrowForm").classList.remove("hide");
  }
}

checkLogin();

function validateInputs() {
  let isValid = true;

  const age = form.elements["age"];
  if (!age.value.match(/^\d+$/) || parseInt(age.value) < 16 || parseInt(age.value) > 120) {
    addBorder(age);
    isValid = false;
  }

  const gender = document.getElementById("gender").innerText;
  if (gender === "Sexo") {
    document.getElementById("gender-border").style.border = "1px solid rgba(255, 0, 0, 0.4)";
    isValid = false;
  }

  const geography = document.getElementById("geography").innerText;
  if (geography === "País") {
    document.getElementById("geography-border").style.border = "1px solid rgba(255, 0, 0, 0.4)";
    isValid = false;
  }

  const credit_score = form.elements["credit_score"];
  if (!credit_score.value.match(/^\d+$/) || parseFloat(credit_score.value) < 0 || parseFloat(credit_score.value) > 1000) {
    addBorder(credit_score);
    isValid = false;
  }

  const tenure = form.elements["tenure"];
  if (!tenure.value.match(/^\d+$/) || parseInt(tenure.value) < 0 || parseInt(tenure.value) > 100 || parseInt(tenure.value) > parseInt(age.value) - 16) {
    addBorder(tenure);
    isValid = false;
  }

  const num_of_products = form.elements["num_of_products"];
  if (!num_of_products.value.match(/^\d+$/) || parseInt(num_of_products.value) < 0 || parseInt(num_of_products.value) > 10) {
    addBorder(num_of_products);
    isValid = false;
  }

  const estimated_salary = form.elements["estimated_salary"];
  if (estimated_salary.value === "" || !estimated_salary.value.match(/^\d*([\.,]?\d{0,2})?$/) || parseFloat(estimated_salary.value) < 0 || parseFloat(estimated_salary.value) > 10000000) {
    addBorder(estimated_salary);
    isValid = false;
  }

  const balance = form.elements["balance"];
  if (balance.value === "" || !balance.value.match(/^[-+]?\d*([.,]?\d{1,2})?$/) || parseFloat(balance.value) < -10000000 || parseFloat(balance.value) > 1000000000) {
    addBorder(balance);
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
    const columns = ['credit_score', 'geography', 'gender', 'age', 'tenure', 'balance', 'num_of_products', 'has_credit_card', 'active_member', 'estimated_salary', 'churn'];

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
    "credit_score": [this.elements["credit_score"].value],
    "geography": [document.getElementById("geography").innerText],
    "gender": [document.getElementById("gender").innerText],
    "age": [this.elements["age"].value],
    "tenure": [this.elements["tenure"].value],
    "balance": [this.elements["balance"].value],
    "num_of_products": [this.elements["num_of_products"].value],
    "has_credit_card": [this.elements["has_credit_card"].checked ? 1 : 0],
    "active_member": [this.elements["active_member"].checked ? 1 : 0],
    "estimated_salary": [this.elements["estimated_salary"].value],
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

      document.getElementById("accuracy").textContent = `Acurácia: ${acuracia}`;
      document.getElementById("precision").textContent = `Precisão: ${precisao}`;
      document.getElementById("recall").textContent = `Recall: ${recall}`;
      document.getElementById("prediction").textContent = `Predição: ${predicao}`;

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
