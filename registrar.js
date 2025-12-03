// Função para validar senha forte
function senhaForte(senha) {
  // mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 símbolo
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
  return regex.test(senha);
}

// Função para compactar a imagem antes de enviar
async function compressImage(file, maxWidth = 300, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = error => reject(error);
    };
  });
}

document.getElementById("formRegistro").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const foto = document.getElementById("foto").files[0];

  let fotoBase64 = null;

  // 🚨 VALIDAR SENHA FORTE AQUI
  if (!senhaForte(senha)) {
    document.getElementById("mensagem").textContent =
      "❌ A senha deve ter no mínimo 8 caracteres, 1 número, 1 letra maiúscula, 1 letra minúscula e 1 símbolo.";
    document.getElementById("mensagem").style.color = "red";
    return; // impede envio do formulário
  }

  if (foto) {
    fotoBase64 = await compressImage(foto);
  }

  const dados = { nome, email, senha, foto: fotoBase64 };

  // corrigido: o backend usa /api/registrar
  const resposta = await fetch("/api/registrar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });

  const resultado = await resposta.json();

  if (resultado.success) {
    document.getElementById("mensagem").textContent = "✔ Cadastro concluído! Verifique seu e-mail.";
    document.getElementById("mensagem").style.color = "lightgreen";
  } else {
    document.getElementById("mensagem").textContent = "❌ " + resultado.error;
    document.getElementById("mensagem").style.color = "red";
  }
});
