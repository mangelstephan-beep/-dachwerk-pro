/* Loaded only by the server-authenticated /workspace page. */
startApp();
document.querySelector('#logout-button').addEventListener('click', event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (!confirmPageChange()) return;
  const form=document.createElement('form');
  form.method='post';form.action='/workspace';
  const action=document.createElement('input');
  action.type='hidden';action.name='action';action.value='logout';
  form.append(action);document.body.append(form);form.submit();
}, true);
