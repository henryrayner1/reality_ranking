import React from 'react';
import './TooltipComponent.css';



const TooltipComponent = ({text, children}) => {
    const [displayFlag, setDisplayFlag] = React.useState(false);

return (
    <div onMouseEnter={() => setDisplayFlag(true)} onMouseLeave={() => setDisplayFlag(false)} className="tooltip-container">
        {children}
        {displayFlag && <div className="tooltip">
            {text}
        </div>}
    </div>
);
};

export default TooltipComponent;
