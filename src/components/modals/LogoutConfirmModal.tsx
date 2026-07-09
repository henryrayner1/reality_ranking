import type { ModalProps } from "../../utils/Constants";

interface LogoutConfirmModalProps extends ModalProps {
  onConfirm: () => void;
}

const LogoutConfirmModal = (props: LogoutConfirmModalProps) => {
  return (
    <div className="modal">
      <div className="relative bg-white p-6 rounded shadow-lg w-96">
        <div className="modal-close" onClick={() => props.setDisplayFlag(false)}>X</div>
        <h2 className="text-2xl font-bold text-black mb-4">Log out?</h2>
        <p className="text-black">Are you sure you want to log out?</p>
        <div className="flex flex-row w-full justify-around mt-10">
          <div className="button px-10" onClick={props.onConfirm}>Log out</div>
          <div className="button px-10" onClick={() => props.setDisplayFlag(false)}>Cancel</div>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
