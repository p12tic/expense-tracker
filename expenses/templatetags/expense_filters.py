from django import template

register = template.Library()

@register.filter
def cents_to_string(value):
    try:
        value = int(value)
    except:
        return ''
    # don't use floating-point numbers here due to potential rounding
    if value % 100 == 0:
        return str(value)

    negative = value < 0
    if negative:
        value = -value
    cents = value % 100
    value = value // 100

    if negative:
        return '{0}.{1:02}'.format(value, cents)
    else:
        return '-{0}.{1:02}'.format(value, cents)
