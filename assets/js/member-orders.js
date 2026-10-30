export function renderMemberOrders(container,data){
 const doc=container.ownerDocument;container.replaceChildren();
 if(!Array.isArray(data.orders)||!data.orders.length){const p=doc.createElement('p');p.className='note';p.textContent='目前沒有已綁定此會員的網站訂單。其他管道訂單請聯絡客服核對。';container.append(p);return}
 for(const order of data.orders){
  const card=doc.createElement('article');card.className='member-order-card';
  const title=doc.createElement('h4');title.textContent=[order.service,order.detail].filter(Boolean).join(' · ')||'接送訂單';card.append(title);
  const lines=[`訂單編號：${order.id}`,`${order.date||'日期待確認'} ${order.time||''} · ${order.status}`,`上車：${order.pickup||'待確認'}`,`下車：${order.destination||'待確認'}`,`付款狀態：${order.paymentStatus}`,order.amount===null?'正式報價：待客服確認':`正式報價：NT$ ${order.amount.toLocaleString('zh-TW')}`];
  if(order.people!==null)lines.push(`乘車人數：${order.people} 位`);
  if(order.estimate!==null&&order.amount===null)lines.push(`需求試算：NT$ ${order.estimate.toLocaleString('zh-TW')}，非正式報價`);
  for(const text of lines){const p=doc.createElement('p');p.textContent=text;card.append(p)}
  container.append(card);
 }
 if(data.hasMore){const p=doc.createElement('p');p.className='note';p.textContent='目前顯示最近 100 筆已綁定訂單，較早紀錄請聯絡客服核對。';container.append(p)}
}
