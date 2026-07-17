import { useState } from "react";
import type { ModalProps } from "../../../utils/Constants";

interface SubmitProps extends ModalProps {
    handleSubmit: () => Promise<void>;
}

const SubmitRankingsModal = (props:SubmitProps) => {
    const [loadingFlag, setLoadingFlag] = useState(false);
    const [submitCompletedFlag, setSubmitCompletedFlag] = useState(false);
    const [errorFlag, setErrorFlag] = useState(false);

    const onSubmit = async () => {
        setLoadingFlag(true);
        setErrorFlag(false);
        try{
            await props.handleSubmit();
            setTimeout(() => {
                setLoadingFlag(false);
                setSubmitCompletedFlag(true);
            }, 1000);
        }catch(error){
            console.error("Error submitting rankings:", error);
            setTimeout(() => {
                setLoadingFlag(false);
                setErrorFlag(true);
            }, 1000);
        }
    }

    const confirmSubmission = <div className="modal-card min-w-[30.25rem]">
        <div className="w-full">
            <h2 className="text-2xl font-bold text-black mb-4">{submitCompletedFlag ? "Success!" : errorFlag ? "Submission Failed" : "Confirm Rankings Submission"}</h2>
            <div className="w-full flex flex-col justify-center py-2 min-h-[4rem]">
            {loadingFlag &&  <div className="loading-circle mx-auto"/>}
            {(!loadingFlag && !submitCompletedFlag && !errorFlag) && <div>
                <p>Please confirm that you wish to submit your rankings.</p>
                <p>This action cannot be undone.</p>
            </div>}
            {(!loadingFlag && submitCompletedFlag) && <div>
                <p>Your rankings have been successfully submitted!</p>
            </div>}
            {(!loadingFlag && errorFlag) && <div>
                <p>Something went wrong submitting your rankings. Please try again.</p>
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

export default SubmitRankingsModal;