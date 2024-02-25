const slideBtn = document.querySelector(".blue-bg button");
const dropdowns = document.querySelectorAll(".dropdown");

let isSliding = false;

slideBtn.addEventListener("click", () => {
  document.querySelector(".container").classList.toggle("change");
  document.querySelector(".blue-bg .logo").classList.toggle("change");

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

function arrow() {
  document.querySelector("form").classList.toggle("hide");
  document.querySelector(".results").classList.toggle("hide");
  document.getElementById("rightArrowForm").classList.remove("hide");
}

function arrowHistory() {
  if (localStorage.getItem('authToken')) {
    document.querySelector(".results").classList.toggle("hide");
    document.querySelector(".history").classList.toggle("hide");
  } else {
    document.querySelector("rightArrowResults").classList.add("hide");
  }
}

document.querySelector(".clearBtn").addEventListener("click", () => {
  document.getElementById("rightArrowForm").classList.add("hide");
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
    if (!dropdown.contains(event.target)) {
      dropdown.querySelector(".menu").classList.remove("menu-open");
      dropdown.querySelector(".fa-caret-down").classList.remove("caret-rotate");
    }
  });
});

document.addEventListener('blur', () => {
  dropdowns.forEach(dropdown => {
    dropdown.querySelector(".menu").classList.remove("menu-open");
    dropdown.querySelector(".fa-caret-down").classList.remove("caret-rotate");
  });
});

function removeBorder(e) {
  e.target.style.border = '';
}

document.querySelectorAll("input").forEach(input => {
  input.addEventListener('click', removeBorder);
  input.addEventListener('focus', removeBorder);
});

document.getElementById("pais-border").addEventListener('click', removeBorder);
document.getElementById("pais-border").addEventListener('focus', removeBorder);
document.getElementById("sexo-border").addEventListener('click', removeBorder);
document.getElementById("sexo-border").addEventListener('focus', removeBorder);