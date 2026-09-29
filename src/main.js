(function(){
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function(id){ return document.getElementById(id); };
  var hasIO = "IntersectionObserver" in window;

  /* ---------- nav + progress (all pages) ---------- */
  var nav = $("nav"), bar = $("progress");
  function onScroll(){
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    if (nav) nav.classList.toggle("scrolled", y > 10);
    if (bar) bar.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
  }
  addEventListener("scroll", onScroll, {passive:true}); onScroll();

  /* ---------- reveal on scroll (only for elements below the fold at load) ---------- */
  if (!reduce && hasIO){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.remove("pre"); io.unobserve(e.target);} });
    }, {rootMargin:"0px 0px -8% 0px"});
    [].forEach.call(document.querySelectorAll(".rv"), function(el){
      if (el.getBoundingClientRect().top > innerHeight){ el.classList.add("pre"); io.observe(el); }
    });
  }

  /* ---------- footer: wordmark, year, copy email (all pages) ---------- */
  var wm = $("wordmark");
  if (wm){
    if (hasIO) new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting) wm.classList.add("lit"); }); }, {threshold:.4}).observe(wm);
    else wm.classList.add("lit");
  }
  if ($("yr")) $("yr").textContent = new Date().getFullYear();
  var cm = $("copyMail"), cs = $("copyState");
  if (cm){
    cm.addEventListener("click", function(){
      var addr = cm.dataset.email;
      function fallback(){ var r=document.createRange(); r.selectNodeContents(cm.querySelector(".addr")); var s=getSelection(); s.removeAllRanges(); s.addRange(r); cs.textContent="Selected"; }
      try { navigator.clipboard.writeText(addr).then(function(){ cs.textContent="Copied"; setTimeout(function(){cs.textContent="Copy";},1800); }, fallback); } catch(e){ fallback(); }
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (!reduce && matchMedia("(hover:hover)").matches){
    [].forEach.call(document.querySelectorAll(".magnet"), function(b){
      b.addEventListener("mousemove", function(e){ var r=b.getBoundingClientRect(); var x=e.clientX-r.left-r.width/2, y=e.clientY-r.top-r.height/2; b.style.transform="translate("+x*.18+"px,"+y*.3+"px)"; });
      b.addEventListener("mouseleave", function(){ b.style.transform=""; });
    });
  }

  /* ---------- jobs filter (jobs page) ---------- */
  var filters = $("jobFilters");
  if (filters){
    filters.addEventListener("click", function(e){
      var b = e.target.closest("button"); if (!b) return;
      [].forEach.call(filters.querySelectorAll("button"), function(x){ x.setAttribute("aria-pressed", String(x === b)); });
      var f = b.dataset.filter;
      [].forEach.call(document.querySelectorAll(".job-card"), function(c){ c.hidden = !(f === "all" || c.dataset.field === f); });
    });
  }

  /* Everything below is home page only. */
  if (!$("joinForm")) return;

  var jobs = [];
  try { jobs = JSON.parse(($("jobsData") || {}).textContent || "[]"); } catch(e){ jobs = []; }

  /* ---------- ticker ---------- */
  var roles = ["Store associate","Customer support agent","Data annotator","Bookkeeper","Video editor","Virtual assistant","QA tester","Merchandiser","Warehouse associate","UX designer","Translator","Event staff","Sales representative","Field technician","Content writer","Inventory auditor"];
  var tt = $("tickerTrack");
  if (tt) tt.innerHTML = roles.concat(roles).map(function(r){return "<span>"+r+"</span>";}).join("");

  /* ---------- counters ---------- */
  if (!reduce && hasIO){
    var cio = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return; cio.unobserve(e.target);
        var el = e.target, to = parseFloat(el.dataset.to), dec = +(el.dataset.dec||0), t0 = null;
        function step(t){ if(!t0) t0=t; var p=Math.min(1,(t-t0)/1600), v=to*(1-Math.pow(1-p,3)); el.textContent=v.toFixed(dec); if(p<1) requestAnimationFrame(step); }
        requestAnimationFrame(step);
      });
    }, {threshold:.6});
    [].forEach.call(document.querySelectorAll(".count"), function(el){ if (el.getBoundingClientRect().top > innerHeight){ el.textContent = (0).toFixed(+(el.dataset.dec||0)); cio.observe(el);} });
  }

  /* ---------- match visual ---------- */
  var have = ["Weekend hours in retail","Evening availability for support","A bookkeeper's free mornings","Design skills between projects","A developer's 15 spare hours","Warehouse experience","Field engineering know-how"];
  var need = ["Holiday store staffing","Customer support coverage","Month-end books","A product launch campaign","A backlog of bug fixes","Peak-season fulfilment","A site inspection"];
  var hl = $("haveList"), nl = $("needList"), svg = $("matchSvg");
  if (hl && nl && svg){
    hl.innerHTML = have.map(function(t){return "<li><span>"+t+"</span></li>";}).join("");
    nl.innerHTML = need.map(function(t){return "<li><span>"+t+"</span></li>";}).join("");
    var NS = "http://www.w3.org/2000/svg", paths = [];
    for (var i=0;i<7;i++){
      var y = 28 + 56*i, cy = 196;
      ["M0 "+y+" C 120 "+y+", 110 "+cy+", 200 "+cy, "M200 "+cy+" C 290 "+cy+", 280 "+y+", 400 "+y].forEach(function(d){
        var base = document.createElementNS(NS,"path"); base.setAttribute("d",d); svg.appendChild(base);
        var f = document.createElementNS(NS,"path"); f.setAttribute("d",d); f.setAttribute("class","flow"); svg.appendChild(f);
        paths.push(f);
      });
    }
    var pairIdx = 0, matchTimer = null;
    var pulse = function(){
      var i = pairIdx % 7, j = (i*3 + 1) % 7; pairIdx++;
      var left = paths[i*2], right = paths[j*2+1], li = hl.children[i], ni = nl.children[j];
      li.classList.add("on");
      left.classList.remove("go"); void left.getBBox(); left.classList.add("go");
      setTimeout(function(){ right.classList.remove("go"); void right.getBBox(); right.classList.add("go"); ni.classList.add("on"); }, 900);
      setTimeout(function(){ li.classList.remove("on"); ni.classList.remove("on"); }, 2800);
    };
    if (!reduce && hasIO){
      new IntersectionObserver(function(es){
        es.forEach(function(e){
          if (e.isIntersecting && !matchTimer){ pulse(); matchTimer = setInterval(pulse, 1500); }
          else if (!e.isIntersecting && matchTimer){ clearInterval(matchTimer); matchTimer = null; }
        });
      }).observe($("match"));
    }
  }

  /* ---------- profile builder demo ---------- */
  var examples = [
    {t:"I managed a clothing store for six years. Free most weekends in Austin.", field:"Retail & Sales", skills:["Store management","Visual merchandising","Team lead"], where:"Austin · in person", hrs:16, grid:{5:[0,1,2],6:[0,1]}, m:"Matching with retail roles near Austin"},
    {t:"Bookkeeper, QuickBooks and Xero. About 15 free hours a week, mostly mornings.", field:"Operations & Admin", skills:["QuickBooks","Xero","Reconciliation"], where:"Remote", hrs:15, grid:{0:[0],1:[0],2:[0],3:[0],4:[0]}, m:"Matching with remote finance and admin work"},
    {t:"Python developer with free evenings. I've built data pipelines and written tests.", field:"Tech & Data", skills:["Python","Data pipelines","QA testing"], where:"Remote", hrs:10, grid:{0:[2],1:[2],2:[2],3:[2]}, m:"Matching with remote data and QA projects"},
    {t:"Fluent in Spanish and English, five years in customer service, happy to work nights.", field:"Customer Support", skills:["Bilingual support","Spanish","Chat and phone"], where:"Remote", hrs:20, grid:{1:[2],2:[2],3:[2],4:[2],5:[1,2]}, m:"Matching with bilingual support teams"}
  ];
  var days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], slots = ["AM","PM","EVE"];
  var wg = $("weekGrid");
  if (wg){
    var cells = [];
    wg.innerHTML = "<span></span>" + days.map(function(d){return "<span>"+d.charAt(0)+"</span>";}).join("");
    slots.forEach(function(s,si){
      var r = document.createElement("span"); r.className="r"; r.textContent=s; wg.appendChild(r);
      days.forEach(function(d,di){ var c=document.createElement("div"); c.className="c"; c.style.setProperty("--d",(di*40+si*60)+"ms"); c.title=d+" "+s; wg.appendChild(c); cells.push({el:c,d:di,s:si}); });
    });
    var parsed = $("parsed"), say = $("sayText"), hrs = $("hrs"), ml = $("matchLine");
    var stepsLis = document.querySelectorAll("#steps li");
    var renderParsed = function(ex, animate){
      function pills(arr, cls, base){ return arr.map(function(s,k){return '<span class="pill '+cls+'" style="--d:'+(animate?base+k*110:0)+'ms">'+s+'</span>';}).join(""); }
      parsed.innerHTML =
        "<dt>Field</dt><dd>"+pills([ex.field],"hl",0)+"</dd>"+
        "<dt>Skills</dt><dd>"+pills(ex.skills,"",200)+"</dd>"+
        "<dt>Where</dt><dd>"+pills([ex.where],"tl",560)+"</dd>";
      hrs.textContent = ex.hrs + " hrs / week";
      ml.textContent = ex.m;
      cells.forEach(function(c){ var on = ex.grid[c.d] && ex.grid[c.d].indexOf(c.s) > -1; c.el.classList.toggle("on", !!on); });
    };
    var setStep = function(n){ [].forEach.call(stepsLis,function(li,k){ li.classList.toggle("active", k===n); }); };
    renderParsed(examples[0], false);
    if (!reduce){
      var exI = 0;
      var typeNext = function(){
        exI = (exI+1) % examples.length; var ex = examples[exI], k = 0;
        setStep(0);
        parsed.innerHTML = ""; cells.forEach(function(c){c.el.classList.remove("on");});
        hrs.textContent = "…"; ml.textContent = "Reading what you wrote";
        say.textContent = "";
        (function tick(){
          k++; say.textContent = ex.t.slice(0,k);
          if (k < ex.t.length) setTimeout(tick, 26 + Math.random()*40);
          else setTimeout(function(){ setStep(1); renderParsed(ex, true); setTimeout(function(){ setStep(2); }, 1600); setTimeout(typeNext, 5200); }, 350);
        })();
      };
      setTimeout(typeNext, 4200);
    }
  }

  /* ---------- split-flap board ---------- */
  /* Open jobs come from content/jobs.json at build time. With none open, the board shows examples. */
  var sample = [
    ["Weekend store associate","Retail","16 h/wk","Austin, TX"],
    ["Bilingual chat support","Support","20 h/wk","Remote"],
    ["Month-end bookkeeper","Operations","12 h/wk","Remote"],
    ["Product video editor","Creative","10 h/wk","Remote"],
    ["Peak-season picker","Logistics","24 h/wk","Dallas, TX"],
    ["Python QA tester","Tech","15 h/wk","Remote"],
    ["Site survey engineer","Specialist","8 h/wk","Houston, TX"],
    ["E-commerce lister","Retail","10 h/wk","Remote"],
    ["Inventory auditor","Logistics","6 h/wk","Chicago, IL"],
    ["Virtual assistant","Operations","15 h/wk","Remote"]
  ];
  var rowsData = jobs.length ? jobs.map(function(j){ return [j.title, j.fieldShort, j.hours, j.where, j.url]; }) : sample;
  var W = [22,10,10,12];
  var board = $("board");
  if (board){
    var pad = function(s,n){ s = String(s).toUpperCase(); return s.length>n ? s.slice(0,n) : s + " ".repeat(n-s.length); };
    var esc = function(ch){ return ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch === "&" ? "&amp;" : ch; };
    var escAttr = function(s){ return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;"); };
    var flapHTML = function(s,n,cls,animate){
      s = pad(s,n);
      return '<div class="flap '+(cls||"")+'" role="cell">' + s.split("").map(function(ch,i){
        return '<i class="'+(ch===" "?"sp ":"")+(animate&&ch!==" "?"f":"")+'" style="--d:'+(i*28)+'ms">'+(ch===" "?"&nbsp;":esc(ch))+'</i>';
      }).join("") + '</div>';
    };
    var rowInner = function(j,animate){ return flapHTML(j[0],W[0],"",animate)+flapHTML(j[1],W[1],"dim",animate)+flapHTML(j[2],W[2],"amb",animate)+flapHTML(j[3],W[3],"dim",animate); };
    var rowHTML = function(j,animate){
      return j[4]
        ? '<a class="row link" role="row" href="'+escAttr(j[4])+'" aria-label="'+escAttr(j[0]+", "+j[3])+'">'+rowInner(j,animate)+'</a>'
        : '<div class="row" role="row">'+rowInner(j,animate)+'</div>';
    };
    var head = '<div class="row h" role="row"><span role="columnheader">ROLE</span><span role="columnheader">FIELD</span><span role="columnheader">HOURS</span><span role="columnheader">WHERE</span></div>';
    var count = Math.min(6, rowsData.length), shown = [], next = count;
    for (var s=0; s<count; s++) shown.push(s);
    board.innerHTML = head + shown.map(function(ix){ return rowHTML(rowsData[ix], false); }).join("");
    if (!reduce && hasIO && rowsData.length > count){
      var slot = 0, bTimer = null;
      var flipOne = function(){
        var rowsEls = board.querySelectorAll(".row:not(.h)"), tmp = document.createElement("div");
        tmp.innerHTML = rowHTML(rowsData[next], true);
        board.replaceChild(tmp.firstChild, rowsEls[slot]);
        shown[slot] = next;
        next = (next+1) % rowsData.length; while (shown.indexOf(next) > -1) next = (next+1) % rowsData.length;
        slot = (slot + 1) % shown.length;
      };
      new IntersectionObserver(function(es){
        es.forEach(function(e){
          if (e.isIntersecting && !bTimer){ bTimer = setInterval(flipOne, 2600); }
          else if (!e.isIntersecting && bTimer){ clearInterval(bTimer); bTimer = null; }
        });
      }).observe(board);
    }
  }

  /* ---------- join form ---------- */
  var form = $("joinForm");
  var ENDPOINT = form.dataset.endpoint || "";
  $("fStarted").value = String(Date.now());
  $("days").innerHTML = days.map(function(d,i){ return '<label><input type="checkbox" id="day'+d+'" name="days" value="'+d+'"'+(i>4?" checked":"")+'><span>'+d+'</span></label>'; }).join("");
  var fh = $("fHours"), ho = $("hoursOut");
  var updHours = function(){ ho.textContent = fh.value + " hrs"; };
  fh.addEventListener("input", updHours); updHours();

  var mW = $("modeWork"), mH = $("modeHire"), hire = false;
  var clearRole = function(){ $("fRole").value = ""; $("roleChip").hidden = true; };
  var setMode = function(h){
    hire = h; mW.setAttribute("aria-pressed", String(!h)); mH.setAttribute("aria-pressed", String(h));
    $("fType").value = h ? "business" : "worker";
    [].forEach.call(form.querySelectorAll(".work-only"), function(el){ el.hidden = h; });
    [].forEach.call(form.querySelectorAll(".hire-only"), function(el){ el.hidden = !h; });
    if (h) clearRole();
    $("hrsLab").textContent = h ? "Hours per week you need covered" : "Hours per week you can give";
    $("aboutLab").textContent = h ? "What do you need done?" : "What do you do?";
    $("fAbout").placeholder = h ? "For example: two weekend associates for our Austin store, starting in November." : "For example: six years in retail management, fluent in Spanish, free on weekends.";
    $("submitBtn").firstChild.textContent = h ? "Send request " : "Create my profile ";
  };
  mW.addEventListener("click", function(){ setMode(false); });
  mH.addEventListener("click", function(){ setMode(true); });
  $("roleClear").addEventListener("click", clearRole);
  if ($("bizBtn")) $("bizBtn").addEventListener("click", function(){ setMode(true); });

  [].forEach.call(document.querySelectorAll("[data-field]"), function(a){
    a.addEventListener("click", function(){
      setMode(false);
      var sel = $("fField"), v = a.dataset.field;
      [].forEach.call(sel.options, function(o){ if (o.value === v) sel.value = v; });
    });
  });

  /* Arriving from a job page: /?role=<slug>#join */
  var roleSlug = new URLSearchParams(location.search).get("role");
  if (roleSlug){
    var job = jobs.filter(function(j){ return j.slug === roleSlug; })[0];
    if (job){
      $("fRole").value = job.slug;
      $("roleName").textContent = job.title;
      $("roleChip").hidden = false;
      var sel = $("fField");
      [].forEach.call(sel.options, function(o){ if (o.value === job.field) sel.value = job.field; });
    }
  }

  var show = function(title, text){
    $("formBody").hidden = true; form.querySelector(".seg").hidden = true; $("roleChip").hidden = true;
    $("doneTitle").textContent = title; $("doneText").textContent = text;
    $("done").hidden = false;
    $("done").scrollIntoView({behavior: reduce ? "auto" : "smooth", block:"center"});
  };

  form.addEventListener("submit", function(e){
    e.preventDefault();
    var name = $("fName"), email = $("fEmail"), consent = $("fConsent"), ok = true, firstBad = null;
    ["eName","eEmail","eConsent"].forEach(function(id){ $(id).textContent = ""; });
    if (!name.value.trim()){ $("eName").textContent = "Add your name so we know who to contact."; ok = false; firstBad = firstBad || name; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())){ $("eEmail").textContent = "Enter an email like you@example.com."; ok = false; firstBad = firstBad || email; }
    if (!consent.checked){ $("eConsent").textContent = "Please agree to the Privacy Policy and Terms so we can contact you."; ok = false; firstBad = firstBad || consent; }
    if (!ok){ firstBad.focus(); return; }

    var first = name.value.trim().split(/\s+/)[0];
    if (!ENDPOINT){
      show("Thanks, " + first + ".", "This is a preview, so your details weren't sent. Once the form is connected, submissions go straight to the Avenrix team.");
      return;
    }
    var btn = $("submitBtn"), label = btn.firstChild.textContent;
    btn.disabled = true; btn.firstChild.textContent = "Sending… ";
    var body = new URLSearchParams(new FormData(form));
    body.set("page", location.pathname + location.search);
    fetch(ENDPOINT, {method:"POST", body: body})
      .then(function(r){ if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function(res){
        if (!res || !res.ok) throw new Error((res && res.error) || "Rejected");
        show("You're in, " + first + ".", hire
          ? "We've got your request. Someone from Avenrix will reply within two business days."
          : "Your profile is saved. We'll email " + email.value.trim() + " when work matches your skills and hours.");
      })
      .catch(function(){
        btn.disabled = false; btn.firstChild.textContent = label;
        $("eConsent").textContent = "That didn't go through. Check your connection and try again, or email us directly.";
      });
  });
})();
