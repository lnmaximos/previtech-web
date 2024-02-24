const container = document.querySelector(".container");
const logo = document.querySelector(".blue-bg .logo");
const form = document.querySelector(".form");
const results = document.querySelector(".results");
const arrowRight = document.querySelector(".fa-arrow-right");
const slideBtn = document.querySelector(".blue-bg button");
const dropdowns = document.querySelectorAll(".dropdown");

let isSliding = false;

slideBtn.addEventListener("click", () => {
  container.classList.toggle("change");
  logo.classList.toggle("change");

  if (isSliding) {
    slideBtn.textContent = "Realizar previsão";
    document.querySelector(".banner").style.transition = "left 0.6s";
  } else {
    slideBtn.textContent = "Deslizar";
    document.querySelector(".banner").style.transition = "left 1s";
  }

  isSliding = !isSliding;
});

function addBorder(e) {
  e.style.border = "1px solid rgba(255, 0, 0, 0.4)";
}

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

form.addEventListener("submit", function (event) {
  event.preventDefault();

  if (!validateInputs()) {
    return;
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
    "salario_estimado": [this.elements["salario_estimado"].value]
  };

  fetch("http://localhost:5000/predict", {
    method: "POST",
    body: JSON.stringify(formData),
    headers: {
      "Content-Type": "application/json"
    }
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
      results.classList.toggle("hide");
    })
    .catch(error => {
      console.error("Erro ao enviar requisição:", error);
      alert("Erro: O servidor está fora do ar.");
    });
});

function arrow() {
  form.classList.toggle("hide");
  results.classList.toggle("hide");
  arrowRight.classList.remove("hide");
}

document.querySelector(".clearBtn").addEventListener("click", () => {
  arrowRight.classList.add("hide");
  document.getElementById("pais").textContent = "País";
  document.getElementById("sexo_biologico").textContent = "Sexo";
  document.querySelectorAll(".dropdown span").forEach(span => {
    span.classList.remove("selected");
  });
  form.querySelectorAll('input, .dropdown').forEach(element => {
    element.style.border = 'none';
  });
});

dropdowns.forEach(dropdown => {
  const caret = dropdown.querySelector(".fa-caret-down");
  const menu = dropdown.querySelector(".menu");
  const options = dropdown.querySelectorAll(".menu li");
  const selected = dropdown.querySelector("span");

  dropdown.addEventListener('click', () => {
    caret.classList.toggle("caret-rotate");
    menu.classList.toggle("menu-open");
  });

  options.forEach(option => {
    option.addEventListener('click', () => {
      selected.innerText = option.innerText;
      caret.classList.remove("caret-rotate");
      menu.classList.remove("menu-open");
      selected.classList.add("selected");
    });
  });

  dropdown.addEventListener('click', (event) => {
    if (event.target.tagName === 'LI') {
      menu.classList.remove("menu-open");
      caret.classList.remove("caret-rotate");
    }
  });
});

document.addEventListener('click', (event) => {
  dropdowns.forEach(dropdown => {
    const menu = dropdown.querySelector(".menu");
    const caret = dropdown.querySelector(".fa-caret-down");

    if (!dropdown.contains(event.target)) {
      menu.classList.remove("menu-open");
      caret.classList.remove("caret-rotate");
    }
  });
});

document.addEventListener('blur', () => {
  dropdowns.forEach(dropdown => {
    const menu = dropdown.querySelector(".menu");
    const caret = dropdown.querySelector(".fa-caret-down");

    menu.classList.remove("menu-open");
    caret.classList.remove("caret-rotate");
  });
});

function removeBorder(event) {
  event.target.style.border = '';
}

document.querySelectorAll("input").forEach(input => {
  input.addEventListener('click', removeBorder);
  input.addEventListener('focus', removeBorder);
});

document.getElementById("pais-border").addEventListener('click', removeBorder);
document.getElementById("pais-border").addEventListener('focus', removeBorder);
document.getElementById("sexo-border").addEventListener('click', removeBorder);
document.getElementById("sexo-border").addEventListener('focus', removeBorder);
