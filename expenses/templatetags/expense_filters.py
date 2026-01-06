from django import template

register = template.Library()


@register.filter
def cents_to_string(value):
    try:
        value = int(value)
    except ValueError:
        return ''
    # don't use floating-point numbers here due to potential rounding
    if value % 100 == 0:
        return str(value // 100)

    negative = value < 0
    if negative:
        value = -value
    cents = value % 100
    value = value // 100

    if negative:
        return f'-{value}.{cents:02}'
    else:
        return f'{value}.{cents:02}'
