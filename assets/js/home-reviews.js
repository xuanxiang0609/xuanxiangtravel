fetch('/reviews/reviews.json')
.then(r=>r.json())
.then(data=>{

  const target=document.getElementById('reviewSlider');

  if(!target) return;

  target.innerHTML=data.map(item=>`
  <div class="review-slide">
    <h3>⭐⭐⭐⭐⭐ ${item.customer}</h3>
    <p>${item.route}</p>
    <p>${item.vehicle}</p>
    <a href="review-detail.html?id=${item.id}">
      查看完整案例
    </a>
  </div>
  `).join('');

});