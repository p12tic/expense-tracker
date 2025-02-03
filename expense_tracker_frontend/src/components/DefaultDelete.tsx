import {SubmitButton} from "./SubmitButton";
import {useNavigate} from "react-router-dom";
import {AuthAxios} from "../utils/Network";



export function DefaultDelete(defaultDeleteProps) {
    const auth = useToken();
    const navigate = useNavigate();
    const submitHandle = async (e) => {
        e.preventDefault();
        let bodyParameters = {
            'id': defaultDeleteProps.id,
            'action': `delete`
        };
        await AuthAxios.post(`http://localhost:8000${defaultDeleteProps.deleteRequestUrl}`,
            auth.getToken(), bodyParameters);
        navigate(`${defaultDeleteProps.returnPoint}`);
    };
    return (
       <>
           <h1>Are you sure to delete</h1>
           <form action="" method="post" onSubmit={submitHandle}>
               <div className="form-horizontal">
                   <div className='btn-group'>
                       <a href={defaultDeleteProps.backLink} className="btn btn-primary" role="button">Cancel</a>
                   </div>
                   <SubmitButton text="Delete" />
               </div>
           </form>
       </>
)
}