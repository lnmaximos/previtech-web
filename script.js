const container = document.querySelector(".container");
const logo = document.querySelector(".blue-bg .logo");
const slideBtn = document.querySelector(".blue-bg button");

let isSliding = false;

slideBtn.addEventListener("click", () => {
  container.classList.toggle("change");
  logo.classList.toggle("change");

  if (isSliding) {
    slideBtn.textContent = "Realizar previsão";
  } else {
    slideBtn.textContent = "Deslizar";
  }

  isSliding = !isSliding;
});

document.querySelector(".form").addEventListener("submit", function (event) {
  event.preventDefault();

  const formData = {
    "score_credito": [parseFloat(this.elements["score_credito"].value)],
    "pais": [this.elements["pais"].value],
    "sexo_biologico": [this.elements["sexo_biologico"].value],
    "idade": [parseInt(this.elements["idade"].value)],
    "anos_de_cliente": [parseInt(this.elements["anos_de_cliente"].value)],
    "saldo": [parseFloat(this.elements["saldo"].value)],
    "servicos_adquiridos": [parseInt(this.elements["servicos_adquiridos"].value)],
    "tem_cartao_credito": [parseInt(this.elements["tem_cartao_credito"].value)],
    "membro_ativo": [parseInt(this.elements["membro_ativo"].value)],
    "salario_estimado": [parseFloat(this.elements["salario_estimado"].value)]
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

      const resultadoText = `Acurácia: ${acuracia}%\nPrecisão: ${precisao}%\nRecall: ${recall}%\nPredição: ${predicao}`;

      alert(resultadoText);
    })
    .catch(error => {
      console.error("Erro ao enviar requisição:", error);
    });
});