document.querySelectorAll(".slideLogin").forEach((element) => {
    element.addEventListener("click", () => {
        document.querySelector("body").classList.toggle("change");
    });
});

document.querySelectorAll(".homePage").forEach((element) => {
    element.addEventListener("click", () => {
        window.open("/", "_self");
    });
});

document.querySelectorAll('.box-login input, .box-register input').forEach((inputElement) => {
    inputElement.addEventListener('click', function () {
        document.getElementById("messageLogin").innerHTML = "";
        document.getElementById("messageRegister").innerHTML = "";
    });
});

async function makeRequest(url, method, body) {
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro:', error.message);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelector('.box-login .submit').addEventListener('click', function () {
        const username = document.querySelector('.box-login input[type="text"]').value;
        const password = document.querySelector('.box-login input[type="password"]').value;

        const loginData = { username: username, password: password };

        makeRequest('http://localhost:5000/login', 'POST', loginData)
            .then(data => {
                if (data.error) {
                    document.getElementById("messageLogin").style.color = "red";
                    document.getElementById("messageLogin").innerHTML = data.error;
                } else {
                    localStorage.setItem('authToken', data.access_token);
                    window.open("/", "_self");
                }
                console.log(data);
            })
            .catch(error => {
                console.error('Erro na requisição:', error.message);
            });
    });

    document.querySelector('.box-register .submit').addEventListener('click', function () {
        const username = document.querySelector('.box-register input[type="text"]').value;
        const password = document.querySelector('.box-register input[type="password"]').value;

        const registerData = { username: username, password: password };

        makeRequest('http://localhost:5000/register', 'POST', registerData)
            .then(data => {
                if (data.error) {
                    document.getElementById("messageRegister").style.color = "red";
                    document.getElementById("messageRegister").innerHTML = data.error;
                } else {
                    localStorage.setItem('authToken', data.access_token);
                    window.open("/", "_self");
                }
                console.log(data);
            })
            .catch(error => {
                console.error('Erro na requisição:', error.message);
            });
    });
});