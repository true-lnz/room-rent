function showLogin(){
  document.getElementById("register-container").style.display = "none";
  document.getElementById("login-container").style.display = "block";
}

function showRegister(){
  document.getElementById("register-container").style.display = "block";
  document.getElementById("login-container").style.display = "none";
}

async function register(){
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const confirm = document.getElementById("reg-confirm").value;
  const role = document.querySelector('input[name="role"]:checked').value;
  if(password !== confirm){ alert("Пароли не совпадают"); return; }
  const res = await fetch("/api/register",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({email, password, role})
  });
  if(res.ok){ alert("Регистрация прошла успешно"); showLogin(); }
  else{ alert("Ошибка: "+ await res.text()); }
}

async function login(){
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const res = await fetch("/api/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    credentials: "include",
    body: JSON.stringify({email, password})
  });
  if(res.ok){
    const data = await res.json();
    localStorage.setItem("token", data.token);
    window.location.href = "/";
  }else{
    alert("Ошибка: "+ await res.text());
  }
}


