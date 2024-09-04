const said_plugins_stores_integration_getClearedUrl = () => {
    let url = location.href;
    return url.replace(/&(search|filter|date_from|date_to)=[^&]*/g, '');
}