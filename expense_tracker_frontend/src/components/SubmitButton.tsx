

export function SubmitButton(submitButtonProps) {
    return <div className="form-horizontal">
        <div className="col-xs-4 col-sm-2 pull-right">
            <input className="btn btn-primary" type="submit" style={{width:"100%"}} role="button" value={submitButtonProps.text}/>
        </div>
    </div>
}