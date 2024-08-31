

export function StaticField(staticFieldProps) {
    return <div>
        <div
            className="col-xs-4 col-sm-2 tmp-static-field-label">{staticFieldProps.label}</div>
        <div className="col-xs-8 col-sm-10 tmp-static-field-content">{staticFieldProps.content}</div>
    </div>

}