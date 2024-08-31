import {observer} from "mobx-react-lite";
import {SubmitButton} from "./SubmitButton.tsx";
import {useNavigate} from "react-router-dom";



export function DefaultDelete(defaultDeleteProps) {
    const navigate = useNavigate();
    const submitHandle = (e) => {
        navigate('confirmed');
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