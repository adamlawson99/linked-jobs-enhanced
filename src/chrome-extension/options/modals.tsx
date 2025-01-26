interface ToastProps {
  message: string;
}

export const Toast = (props: ToastProps) => {
  return (
    <div
      className=" bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ease-in-out"
      style={{ animation: "fadeOut 3s forwards" }}
    >
      {props.message}
    </div>
  );
};
