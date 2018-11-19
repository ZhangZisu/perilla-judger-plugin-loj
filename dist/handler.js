const submitHandler = async (lang, source) => {
    if (!editor)
        return null;
    editor.setValue(source);
    let menu = document.querySelector('#languages-menu');
    if (!menu)
        return null;
    menu.querySelector(`[data-value="${lang}"]`).click();
    submit_code();
    const form = document.querySelector("#submit_code");
    const url = form.action;
    const formdata = new FormData(form);
    const res = await fetch(url, { method: 'POST', body: formdata });
    return res.url.substr(res.url.lastIndexOf('/') + 1);
};
const waitForWS = () => {
    return vueApp.$data.roughData.result !== null;
};
module.exports = { submitHandler, waitForWS };
//# sourceMappingURL=handler.js.map