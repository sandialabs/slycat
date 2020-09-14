export const getFormattedDateTime = (): string => {
  const d = new Date();
  return (
    d.getDate() +
    "-" +
    (d.getMonth() + 1) +
    "-" +
    d.getFullYear() +
    " " +
    d.getHours() +
    ":" +
    (d.getMinutes()<10?"0"+d.getMinutes():d.getMinutes()) +
    ":" +
    (d.getSeconds()<10?"0"+d.getSeconds():d.getSeconds())
  );
};