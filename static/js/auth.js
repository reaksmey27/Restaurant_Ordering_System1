// authPanel.js
const container = document.getElementById('container');
if (container) {
  const signUpButton = document.getElementById('signUp');
  const signInButton = document.getElementById('signIn');

  if (signUpButton) signUpButton.addEventListener('click', () => container.classList.add('right-panel-active'));
  if (signInButton) signInButton.addEventListener('click', () => container.classList.remove('right-panel-active'));

  if (document.querySelector('.register_error') || document.querySelector('.register_success')) {
    container.classList.add('right-panel-active');
  }
  if (document.querySelector('.login_error')) {
    container.classList.remove('right-panel-active');
  }
}
