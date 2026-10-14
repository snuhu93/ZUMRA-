import React from "react";

export default function Badge({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  return (
    <span
      style={{
        position: "absolute",
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        borderRadius: 9,
        background: "#e11d48",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
    }
