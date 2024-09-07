import '../../../expenses/static/libs/bootstrap-3.3.5/css/bootstrap.min.css';
import '../../../expenses/static/libs/bootstrap-datepicker/bootstrap-datetimepicker.min.css';
import '../../../expenses/static/libs/bootstrap-touchspin/jquery.bootstrap-touchspin.min.css';
import '../../../expenses/static/expenses/common.css';
import {Link} from 'react-router-dom';

interface TableButtonProps {
    dest: string;
    name: string;
}
export const TableButton = function TableButton (tableButtonProps: TableButtonProps) {
    return <div className='btn-group'>
        <Link to={tableButtonProps.dest} className="btn btn-primary text-right">{tableButtonProps.name}</Link>
    </div>
}