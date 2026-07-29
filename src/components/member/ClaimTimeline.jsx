import "./ClaimTimeline.css";

function ClaimTimeline({

  status = "Pending"

}) {

  const steps = [

    "Submitted",

    "Under Review",

    "Approved",

    "Paid",

  ];

  const current =
    steps.indexOf(status);

  return (

    <div className="timeline">

      {steps.map((step,index)=>(

        <div
          key={step}
          className={
            index<=current
            ? "timeline-step active"
            : "timeline-step"
          }
        >

          <div className="circle"/>

          <span>

            {step}

          </span>

        </div>

      ))}

    </div>

  );

}

export default ClaimTimeline;