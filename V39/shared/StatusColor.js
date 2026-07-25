const STATUS_COLORS = {
  "待確認":"#F9A825",
  "已派車":"#1976D2",
  "行程中":"#2E7D32",
  "已完成":"#616161",
  "已取消":"#C62828"
};

function getStatusColor_(status){
  return STATUS_COLORS[status] || "#9E9E9E";
}
