import { useState } from "react";
import type { ModalProps } from "../../../utils/Constants";

interface AddProps extends ModalProps {
    handleAddShow: (showName:string) => Promise<void>;
}

const AddShowModal = (props:AddProps) => {
    const [loadingFlag, setLoadingFlag] = useState(false);
    const [submitCompletedFlag, setSubmitCompletedFlag] = useState(false);
    const [showName, setShowName] = useState("");

    const onSubmit = async () => {
        try{
            setLoadingFlag(true);
            await props.handleAddShow(showName);
        }catch{

        }finally{
            setLoadingFlag(false);
            setSubmitCompletedFlag(true);
        }
    }

    const confirmSubmission = <div className="modal-card min-w-[30.25rem]">
        <div className="w-full">
            <h2 className="text-2xl font-bold text-black mb-4">{submitCompletedFlag ? "Success!" : "Add Show"}</h2>
            <div className="w-full flex flex-col justify-center py-2 min-h-[4rem]">
                {loadingFlag &&  <div className="loading-circle mx-auto"/>}
                {!submitCompletedFlag && !loadingFlag && <input type="text" className="text-input" placeholder="Show Name" value={showName} onChange={(e) => setShowName(e.target.value)}/>}
                {(!loadingFlag && submitCompletedFlag) && <div>
                    <p>{showName} has been added!</p>
                </div>}
            </div>
            {!submitCompletedFlag && <div className="flex flex-row w-full justify-around mt-10">
                <div className={`button px-10 ${loadingFlag && 'inactive'}`}onClick={() => onSubmit()}>Confirm</div>
                <div className={`button px-10 ${loadingFlag && 'inactive'}` }onClick={() => props.setDisplayFlag(false)}>Cancel</div>
            </div>}
            {submitCompletedFlag && <div className="flex flex-row w-full justify-center mt-10">
                <div className="button px-10" onClick={() => props.setDisplayFlag(false)}>Close</div>
            </div>}
        </div>
    </div>
  return (
    <div className="modal">
        {confirmSubmission}
    </div>
  )
}

export default AddShowModal;