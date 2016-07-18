function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
var csrftoken = getCookie('csrftoken');
function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}
$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});

function performAjax(data) {
    return $.ajax({
        type: 'POST',
        url: '/json',
        data: JSON.stringify(data),
        contentType: "application/json",
        dataType: 'json',
    })
};

function getCurrentDateTimeString() {
    var currentdate = new Date();
    return "" + currentdate.getFullYear() + "-"
              + (currentdate.getMonth()+1)  + "-"
              + currentdate.getDate() + " "
              + currentdate.getHours() + ":"
              + currentdate.getMinutes();
}

function betterSpinner(elem, config) {
    // see http://stackoverflow.com/questions/16791940/jquery-ui-spinner-able-to-exceed-max-by-keyboard#16856867
    return elem.spinner(config).on('input', function () {
        if ($(this).data('onInputPrevented')) return;
        var val = this.value,
            $this = $(this),
            max = $this.spinner('option', 'max'),
            min = $this.spinner('option', 'min');
        // We want only number, no alphabetic chars.
        // We set it to previous default value.
        if (!val.match(/^[+-]?[\d]{0,}$/)) val = $(this).data('defaultValue');
        this.value = val > max ? max : val < min ? min : val;
    }).on('keydown', function (e) {
        // we set default value for spinner.
        if (!$(this).data('defaultValue')) $(this).data('defaultValue', this.value);
        // To handle backspace
        $(this).data('onInputPrevented', e.which === 8 ? true : false);
    });
}
