document.addEventListener("DOMContentLoaded",function(){
  const box=document.createElement("div");
  box.id="s2oLightbox";
  box.innerHTML='<img alt="S2O 圖片放大">';
  document.body.appendChild(box);

  const img=box.querySelector("img");

  document.querySelectorAll("img").forEach(function(el){
    if((el.src||"").toLowerCase().includes("s2o")){
      el.classList.add("s2o-lightbox-img");
      el.addEventListener("click",function(){
        img.src=el.src;
        box.style.display="flex";
      });
    }
  });

  box.addEventListener("click",function(){
    box.style.display="none";
    img.src="";
  });
});
