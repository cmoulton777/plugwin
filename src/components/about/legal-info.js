import React from "react";

const LegalInfo = props => {
  const { src } = props;
  return (
    <div>
      <iframe
        width={"100%"}
        style={{
          background: "#fff",
          height: "95vh",
          margin: "0 auto",
          display: "table-cell",
          maxWidth: 960
        }}
        src={src}
        frameBorder={0}
        allowFullScreen
      >
        <p>Your browser does not support iframes.</p>
      </iframe>
    </div>
  );
};

export default LegalInfo;
