// Aplica o tema antes do Angular carregar, para a página não "piscar" no tema errado.
// Ordem: escolha salva pelo usuário > preferência do sistema. Arquivo separado porque a CSP não permite script inline.
(function () {
  var theme = null;
  try {
    theme = localStorage.getItem('ademiro-theme');
  } catch (e) {}
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-bs-theme', theme);
})();
