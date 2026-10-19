const STORAGE_KEY = "drnews_posts_v2";
const AUTHOR_KEY = "drnews_author";
const CATEGORIES = ["Atualidades", "Experiências", "Estudos", "Áudio e foco", "Bem-estar", "Comunidade"];
const MAX_COVER_FILE_BYTES = 450 * 1024;
const MAX_MEDIA_FILE_BYTES = 300 * 1024;
const MAX_POST_MEDIA_CHARS = 2_300_000;
const MAX_SAVED_CHARACTERS = 3_500_000;

const seedPosts = [
  { id: "s1", title: "Relatos pessoais levantam conversas sobre sonhos e experiências", summary: "Membros da comunidade compartilham vivências e refletem sobre como registrar experiências com cuidado.", body: "Relatos pessoais podem ser interessantes para compreender experiências e pontos de vista diferentes. Ao compartilhar uma vivência, é útil separar observações, interpretações e conclusões, respeitando a privacidade de todos.", category: "Experiências", author: "Equipe DRNews", date: "Hoje", views: 4200, kind: "Artigo", topics: ["Relatos"] },
  { id: "s2", title: "O que observar ao avaliar conteúdos de áudio e concentração?", summary: "Um guia para analisar objetivos, hábitos de escuta e a qualidade das informações divulgadas.", body: "Antes de experimentar um conteúdo de áudio, confira a descrição, a origem e o contexto em que foi produzido. Experiências individuais variam e não substituem orientação profissional quando ela é necessária.", category: "Áudio e foco", author: "Marina Costa", date: "Ontem", views: 3800, kind: "Artigo", topics: ["Concentração"] },
  { id: "s3", title: "Diário de hábitos: por que acompanhar pequenas mudanças?", summary: "Anotar rotinas e percepções ajuda a organizar experiências ao longo do tempo.", body: "Um diário simples pode registrar data, contexto, rotina e percepções pessoais. Evite tirar conclusões a partir de uma única ocorrência e lembre-se de que correlação não comprova causa.", category: "Bem-estar", author: "Redação DRNews", date: "Ontem", views: 3100, kind: "Artigo", topics: ["Hábitos"] },
  { id: "s4", title: "Comunidades online discutem novas formas de compartilhar conhecimento", summary: "Espaços colaborativos podem aproximar pessoas, desde que haja regras claras e respeito.", body: "Comunidades bem cuidadas oferecem diretrizes, mecanismos de denúncia e espaço para diferentes opiniões. Antes de publicar informações de terceiros, peça autorização e confira a procedência.", category: "Comunidade", author: "Lucas Martins", date: "2 dias atrás", views: 2700, kind: "Discussão", topics: ["Comunidades"] },
  { id: "s5", title: "Como ler relatos com curiosidade e senso crítico", summary: "Perguntas simples ajudam a diferenciar opinião, experiência e informação verificável.", body: "Ao ler um relato, observe o contexto, a fonte e se há evidências independentes. Respeitar a experiência de alguém não exige tratar toda interpretação como fato comprovado.", category: "Estudos", author: "Equipe DRNews", date: "3 dias atrás", views: 2400, kind: "Artigo", topics: ["Leitura crítica"] },
  { id: "s6", title: "Tendências de desenvolvimento pessoal que estão em pauta", summary: "Organização, consistência e reflexão aparecem com frequência nas conversas sobre hábitos.", body: "Métodos de desenvolvimento pessoal podem servir como ferramentas de reflexão. Escolha objetivos realistas, observe como você se sente e ajuste a rotina de acordo com suas necessidades.", category: "Atualidades", author: "Nina Rocha", date: "4 dias atrás", views: 1900, kind: "Artigo", topics: ["Desenvolvimento pessoal"] }
];

const $ = (id) => document.getElementById(id);
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const slugify = (value) => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const articleKind = (post) => post.kind || "Artigo";

let localPosts = [];
let rememberedAuthor = "Visitante";
let storageAvailable = true;
try {
  const rawPosts = localStorage.getItem(STORAGE_KEY);
  if (rawPosts) {
    const parsed = JSON.parse(rawPosts);
    if (Array.isArray(parsed)) localPosts = parsed.filter((post) => post && post.id && post.title);
    else if (parsed && Array.isArray(parsed.posts)) {
      localPosts = parsed.posts.filter((post) => post && post.id && post.title);
      if (typeof parsed.author === "string" && parsed.author.trim()) rememberedAuthor = parsed.author;
    }
  }
  rememberedAuthor = localStorage.getItem(AUTHOR_KEY) || rememberedAuthor;
} catch {
  localPosts = [];
  storageAvailable = false;
}
let posts = [...localPosts, ...seedPosts];
let activeCategory = "Todas";
let editingPostId = null;
let composerKind = "Artigo";
let composerCover = "";
let composerMedia = [];
let draftTopics = [];
let previewMode = false;
let toastTimer;

function svgCover(category, title) {
  const palettes = {
    "Atualidades": ["#593d43", "#d24a3f"],
    "Experiências": ["#4f3c4d", "#af5148"],
    "Estudos": ["#3e4f55", "#c17b57"],
    "Áudio e foco": ["#4b435a", "#bc6963"],
    "Bem-estar": ["#465448", "#b47f62"],
    "Comunidade": ["#4d4944", "#be604e"]
  };
  const [base, accent] = palettes[category] || ["#4c4f57", "#bd554d"];
  const label = escapeHTML(category.toUpperCase());
  const shortTitle = escapeHTML(title.length > 37 ? `${title.slice(0, 35)}…` : title);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${base}"/><stop offset="1" stop-color="#777980"/></linearGradient><radialGradient id="r"><stop stop-color="${accent}" stop-opacity=".82"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs><rect width="1200" height="640" fill="url(#g)"/><circle cx="950" cy="160" r="360" fill="url(#r)"/><circle cx="940" cy="160" r="210" fill="none" stroke="#fff" stroke-opacity=".2"/><circle cx="940" cy="160" r="265" fill="none" stroke="#fff" stroke-opacity=".12"/><path d="M0 520Q360 400 720 520T1440 450V700H0Z" fill="#292b32" fill-opacity=".25"/><text x="60" y="520" fill="#ffffff" fill-opacity=".8" font-family="Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="5">${label}</text><text x="60" y="568" fill="#ffffff" fill-opacity=".92" font-family="Arial,sans-serif" font-size="27" font-weight="600">${shortTitle}</text><text x="1030" y="330" fill="#ffffff" fill-opacity=".74" font-family="Arial,sans-serif" font-size="80" font-weight="900" text-anchor="middle">DR.</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function coverFor(post) {
  return post.cover || svgCover(post.category, post.title || "DRNews");
}

function initials(name) {
  return String(name || "DR").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "DR";
}

function persistPosts(ownPosts, author) {
  const payload = JSON.stringify({ posts: ownPosts, author: author || rememberedAuthor || "Visitante" });
  if (payload.length > MAX_SAVED_CHARACTERS) {
    $("storageStatus").textContent = "O armazenamento local está cheio. Remova mídias ou posts seus antes de tentar novamente.";
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, payload);
    rememberedAuthor = author || rememberedAuthor || "Visitante";
    storageAvailable = true;
    $("storageStatus").textContent = "Demonstração local: seus posts estão salvos neste navegador.";
    return true;
  } catch (error) {
    if (error?.name === "SecurityError") storageAvailable = false;
    $("storageStatus").textContent = "O navegador não conseguiu salvar localmente. Reduza as mídias ou confira as permissões de armazenamento.";
    return false;
  }
}

function renderCard(post) {
  const id = escapeHTML(post.id);
  const category = escapeHTML(post.category || "Comunidade");
  const title = escapeHTML(post.title);
  const author = escapeHTML(post.author || "Visitante");
  const date = escapeHTML(post.date || "Agora");
  const cover = escapeHTML(coverFor(post));
  const summary = escapeHTML(post.summary || "");
  const views = Number(post.views || 0);
  return `<article class="post-card"><a class="post-cover" href="#/post/${encodeURIComponent(post.id)}" aria-label="Ler: ${title}"><img src="${cover}" alt="Capa de ${title}" loading="lazy"><span class="cover-shade"></span><span class="cover-label">${category}</span></a><div class="post-card-body"><span class="post-kind-tag">${escapeHTML(articleKind(post))} · ${category}</span><h3><a href="#/post/${encodeURIComponent(post.id)}">${title}</a></h3><p>${summary}</p><div class="post-meta"><span class="author-avatar" aria-hidden="true">${escapeHTML(initials(author))}</span><span class="meta-author">${author}</span><span class="meta-separator">·</span><span>${date}</span><span class="views-label" aria-label="${views} leituras">◉ ${views ? `${(views / 1000).toFixed(1)} mil` : "novo"}</span></div></div></article>`;
}

function renderFeed() {
  const query = $("searchInput").value.trim().toLocaleLowerCase("pt-BR");
  const sortBy = $("sortSelect").value;
  let filtered = posts.filter((post) => {
    const matchesCategory = activeCategory === "Todas" || post.category === activeCategory;
    const searchable = [post.title, post.summary, post.category, post.author, ...(post.topics || [])].join(" ").toLocaleLowerCase("pt-BR");
    return matchesCategory && searchable.includes(query);
  });
  filtered = [...filtered].sort((a, b) => sortBy === "popular" ? Number(b.views || 0) - Number(a.views || 0) : Number(b.createdAt || 0) - Number(a.createdAt || 0) || posts.indexOf(a) - posts.indexOf(b));
  $("feedTitle").textContent = activeCategory === "Todas" ? "Últimas publicações" : activeCategory;
  $("postGrid").innerHTML = filtered.length ? filtered.map(renderCard).join("") : `<div class="empty-state"><strong>Nenhum post por aqui ainda.</strong>Tente outra busca ou escolha uma editoria diferente.</div>`;
  document.querySelectorAll("[data-category]").forEach((button) => button.classList.toggle("active", button.dataset.category === activeCategory));
  renderPopular();
}

function renderPopular() {
  const trending = [...posts].sort((a, b) => Number(b.views || 0) - Number(a.views || 0)).slice(0, 5);
  $("popularList").innerHTML = trending.map((post, index) => `<div class="trending-item"><span class="trending-number">${String(index + 1).padStart(2, "0")}</span><div><a href="#/post/${encodeURIComponent(post.id)}">${escapeHTML(post.title)}</a><small>${escapeHTML(post.date || "Agora")} · ${Number(post.views || 0).toLocaleString("pt-BR")} leituras</small></div></div>`).join("");
}

function mediaMarkup(media, preview = false) {
  if (!Array.isArray(media) || !media.length) return "";
  const cls = preview ? "preview-media" : "detail-media";
  return `<div class="${cls}">${media.map((item) => {
    const src = escapeHTML(item.src || "");
    const name = escapeHTML(item.name || "Mídia do post");
    if ((item.type || "").startsWith("image/")) return `<figure><img src="${src}" alt="${name}" loading="lazy"><figcaption class="media-caption">${name}</figcaption></figure>`;
    if ((item.type || "").startsWith("video/")) return `<figure><video controls preload="metadata" src="${src}">${name}</video><figcaption class="media-caption">${name}</figcaption></figure>`;
    if ((item.type || "").startsWith("audio/")) return `<figure><audio controls preload="metadata" src="${src}">${name}</audio><figcaption class="media-caption">${name}</figcaption></figure>`;
    return "";
  }).join("")}</div>`;
}

function renderArticlePage(post) {
  const category = escapeHTML(post.category || "Comunidade");
  const author = escapeHTML(post.author || "Visitante");
  const title = escapeHTML(post.title);
  const ownPost = post.local === true;
  const topics = [...new Set([category, ...(post.topics || [])])].filter(Boolean);
  $("articlePage").innerHTML = `<a class="article-back" href="#feed">← Voltar ao feed</a><article class="article-detail"><div class="detail-cover"><img src="${escapeHTML(coverFor(post))}" alt="Capa de ${title}"><span class="cover-shade"></span><span class="cover-label">${category}</span></div><div class="detail-inner"><div class="detail-type">${escapeHTML(articleKind(post))} · ${category}</div><h1>${title}</h1><p class="detail-summary">${escapeHTML(post.summary || "")}</p><div class="detail-byline"><span class="author-avatar" aria-hidden="true">${escapeHTML(initials(author))}</span><span>Por <strong>${author}</strong></span><span class="meta-separator">·</span><span>${escapeHTML(post.date || "Agora")}</span><div class="detail-controls">${ownPost ? `<button class="button button-outline" type="button" data-edit-post="${escapeHTML(post.id)}">Editar post</button><button class="button button-outline" type="button" data-delete-post="${escapeHTML(post.id)}">Excluir</button>` : ""}</div></div><div class="detail-body">${escapeHTML(post.body || "")}</div>${mediaMarkup(post.media)}<div class="detail-topics">${topics.map((topic) => `<span class="detail-topic">#${escapeHTML(topic)}</span>`).join("")}</div><p class="detail-footnote">Post compartilhado na comunidade DRNews. Experiências individuais são perspectivas pessoais; confira fontes e contexto antes de tratar alegações como fatos.</p></div></article>`;
  $("feedPage").hidden = true;
  $("articlePage").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function route() {
  const match = window.location.hash.match(/^#\/post\/(.+)$/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    const post = posts.find((item) => item.id === id);
    if (post) { renderArticlePage(post); return; }
  }
  $("articlePage").hidden = true;
  $("feedPage").hidden = false;
  renderFeed();
}

function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("visible"), 3200);
}

function openComposer(postId = null) {
  if (!storageAvailable) { toast("O navegador bloqueou o armazenamento local; não é possível publicar neste protótipo."); return; }
  const form = $("postForm");
  form.reset();
  editingPostId = postId;
  composerKind = "Artigo";
  composerCover = "";
  composerMedia = [];
  draftTopics = [];
  previewMode = false;
  $("composerFeedback").textContent = "";
  $("postCategory").value = "Experiências";
  $("authorInput").value = rememberedAuthor;
  if (postId) {
    const post = posts.find((item) => item.id === postId);
    if (!post) return;
    composerKind = articleKind(post);
    composerCover = post.cover || "";
    composerMedia = Array.isArray(post.media) ? [...post.media] : [];
    draftTopics = (post.topics || []).filter((topic) => topic !== post.category);
    $("postTitle").value = post.title || "";
    $("postSummary").value = post.summary || "";
    $("postBody").value = post.body || "";
    $("postCategory").value = CATEGORIES.includes(post.category) ? post.category : "Comunidade";
    $("authorInput").value = post.author || "Visitante";
    $("composerTitle").textContent = "Editar seu post";
  } else {
    $("composerTitle").textContent = "Criar um post";
  }
  document.querySelectorAll("[data-kind]").forEach((button) => button.classList.toggle("active", button.dataset.kind === composerKind));
  renderComposerMedia();
  renderDraftTopics();
  renderCoverPreview();
  showComposeStep();
  if (!$("composerDialog").open) $("composerDialog").showModal();
  document.body.classList.add("dialog-open");
  setTimeout(() => $("postTitle").focus(), 50);
}

function resetComposer() {
  $("postForm").reset();
  editingPostId = null;
  composerKind = "Artigo";
  composerCover = "";
  composerMedia = [];
  draftTopics = [];
  previewMode = false;
  $("composerFeedback").textContent = "";
  $("composerTitle").textContent = "Criar um post";
  renderComposerMedia();
  renderDraftTopics();
  renderCoverPreview();
  showComposeStep();
}

function closeComposer() {
  if ($("composerDialog").open) $("composerDialog").close();
  resetComposer();
  document.body.classList.remove("dialog-open");
}

function showComposeStep() {
  previewMode = false;
  $("composePanel").hidden = false;
  $("previewPanel").hidden = true;
  $("stepCompose").classList.add("active");
  $("stepPreview").classList.remove("active");
}

function showPreviewStep() {
  if (!$("postForm").reportValidity()) return;
  renderPostPreview();
  previewMode = true;
  $("composePanel").hidden = true;
  $("previewPanel").hidden = false;
  $("stepCompose").classList.remove("active");
  $("stepPreview").classList.add("active");
  $("composerDialog").scrollTop = 0;
}

function currentDraft() {
  return {
    title: $("postTitle").value.trim(),
    summary: $("postSummary").value.trim(),
    body: $("postBody").value.trim(),
    category: $("postCategory").value,
    author: $("authorInput").value.trim() || "Visitante",
    kind: composerKind,
    cover: composerCover,
    media: [...composerMedia],
    topics: [...new Set([$("postCategory").value, ...draftTopics])]
  };
}

function renderPostPreview() {
  const draft = currentDraft();
  const cover = escapeHTML(draft.cover || svgCover(draft.category, draft.title));
  const topics = draft.topics.map((topic) => `<span class="detail-topic">#${escapeHTML(topic)}</span>`).join("");
  $("postPreviewCard").innerHTML = `<div class="preview-cover"><img src="${cover}" alt="Capa de ${escapeHTML(draft.title)}"><span class="cover-shade"></span><span class="cover-label">${escapeHTML(draft.category)}</span></div><div class="preview-card-copy"><span class="post-kind-tag">${escapeHTML(draft.kind)} · ${escapeHTML(draft.category)}</span><h4>${escapeHTML(draft.title)}</h4><p>${escapeHTML(draft.summary)}</p><div class="preview-card-byline"><span class="author-avatar" aria-hidden="true">${escapeHTML(initials(draft.author))}</span><span>${escapeHTML(draft.author)}</span><span class="meta-separator">·</span><span>Agora</span></div><div class="preview-body">${escapeHTML(draft.body)}</div>${mediaMarkup(draft.media, true)}<div class="detail-topics">${topics}</div></div>`;
}

function renderCoverPreview() {
  const target = $("coverPreview");
  const oldImage = target.querySelector("img");
  if (oldImage) oldImage.remove();
  if (composerCover) {
    const image = document.createElement("img");
    image.src = composerCover;
    image.alt = "Prévia da imagem de capa";
    target.append(image);
  }
}

function renderComposerMedia() {
  $("mediaDraftList").innerHTML = composerMedia.map((item) => {
    const preview = item.type.startsWith("image/") ? `<img src="${escapeHTML(item.src)}" alt="${escapeHTML(item.name)}">` : item.type.startsWith("video/") ? `<video controls src="${escapeHTML(item.src)}"></video>` : `<div class="media-draft-label">♫ ${escapeHTML(item.name)}</div>`;
    return `<div class="media-draft">${preview}<button class="remove-media" type="button" aria-label="Remover ${escapeHTML(item.name)}" data-remove-media="${escapeHTML(item.id)}">×</button></div>`;
  }).join("");
}

function renderDraftTopics() {
  $("draftTopics").innerHTML = draftTopics.map((topic, index) => `<span class="draft-topic">#${escapeHTML(topic)}<button type="button" aria-label="Remover tópico ${escapeHTML(topic)}" data-remove-topic="${index}">×</button></span>`).join("");
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler este arquivo."));
    reader.readAsDataURL(file);
  });
}

async function acceptCover(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) { $("composerFeedback").textContent = "A capa precisa ser uma imagem."; return; }
  if (file.size > MAX_COVER_FILE_BYTES) { $("composerFeedback").textContent = "A imagem de capa precisa ter até 450 KB neste protótipo local."; return; }
  try {
    const src = await readFile(file);
    const mediaCharacters = composerMedia.reduce((total, item) => total + item.src.length, 0);
    if (src.length + mediaCharacters > MAX_POST_MEDIA_CHARS) { $("composerFeedback").textContent = "O conjunto de capa e mídias passou do limite seguro. Remova algum arquivo e tente novamente."; return; }
    composerCover = src;
    $("composerFeedback").textContent = "Imagem de capa adicionada.";
    renderCoverPreview();
  } catch (error) { $("composerFeedback").textContent = error.message; }
}

async function acceptMedia(files) {
  const selected = [...files];
  if (!selected.length) return;
  for (const file of selected) {
    if (!/^(image|video|audio)\//.test(file.type)) { $("composerFeedback").textContent = "Escolha uma imagem, um vídeo ou um áudio."; continue; }
    if (file.size > MAX_MEDIA_FILE_BYTES) { $("composerFeedback").textContent = `${file.name} excede 300 KB; use um arquivo menor neste protótipo local.`; continue; }
    if (composerMedia.length >= 4) { $("composerFeedback").textContent = "Você pode incluir até quatro mídias por post."; break; }
    try {
      const src = await readFile(file);
      const existingMediaCharacters = composerMedia.reduce((total, item) => total + item.src.length, 0);
      if (composerCover.length + existingMediaCharacters + src.length > MAX_POST_MEDIA_CHARS) { $("composerFeedback").textContent = "O conjunto de capa e mídias passou do limite seguro. Remova algum arquivo e tente novamente."; continue; }
      composerMedia.push({ id: `m${Date.now()}${Math.random().toString(16).slice(2, 6)}`, src, type: file.type, name: file.name });
    } catch (error) { $("composerFeedback").textContent = error.message; }
  }
  renderComposerMedia();
  $("mediaInput").value = "";
  if (composerMedia.length) $("composerFeedback").textContent = "Mídia adicionada ao conteúdo do post.";
}

function addTopic() {
  const value = $("topicInput").value.trim().replace(/^#/, "");
  if (!value) return;
  if (value.length > 24) { $("composerFeedback").textContent = "Cada tópico pode ter até 24 caracteres."; return; }
  if (draftTopics.some((topic) => topic.toLocaleLowerCase("pt-BR") === value.toLocaleLowerCase("pt-BR"))) { $("composerFeedback").textContent = "Esse tópico já foi adicionado."; return; }
  draftTopics.push(value);
  $("topicInput").value = "";
  $("composerFeedback").textContent = "Tópico adicionado.";
  renderDraftTopics();
}

function publishDraft(event) {
  event.preventDefault();
  if (!previewMode) { showPreviewStep(); return; }
  if (!$("postForm").reportValidity()) { showComposeStep(); return; }
  const draft = currentDraft();
  const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date());
  const wasEditing = Boolean(editingPostId);
  let resultingPost;
  let nextPosts;
  if (wasEditing) {
    const target = posts.find((post) => post.id === editingPostId);
    if (!target || !target.local) { toast("Este post não pode ser editado neste protótipo."); return; }
    resultingPost = { ...target, ...draft, date, updatedAt: Date.now() };
    nextPosts = posts.map((post) => post.id === editingPostId ? resultingPost : post);
  } else {
    resultingPost = { id: `u${Date.now()}`, ...draft, date: `Hoje · ${date}`, views: 0, local: true, createdAt: Date.now() };
    nextPosts = [resultingPost, ...posts];
  }
  const saved = persistPosts(nextPosts.filter((post) => post.local === true), draft.author);
  if (!saved) {
    $("composerFeedback").textContent = "Não foi possível salvar. Reduza ou remova mídias e tente publicar novamente.";
    toast("O post não foi publicado porque não coube no armazenamento local.");
    return;
  }
  posts = nextPosts;
  const publishedId = resultingPost.id;
  activeCategory = "Todas";
  $("searchInput").value = "";
  closeComposer();
  renderFeed();
  const destination = `#/post/${encodeURIComponent(publishedId)}`;
  if (wasEditing && window.location.hash === destination) route();
  else window.location.hash = destination;
  toast(wasEditing ? "Seu post foi atualizado." : "Post publicado no feed.");
}

function deletePost(postId) {
  const post = posts.find((item) => item.id === postId);
  if (!post || !post.local) return;
  const nextPosts = posts.filter((item) => item.id !== postId);
  if (!persistPosts(nextPosts.filter((item) => item.local === true), rememberedAuthor)) { toast("Não foi possível remover o post do armazenamento local."); return; }
  posts = nextPosts;
  window.location.hash = "#feed";
  toast("Post removido deste navegador.");
}

function connectEvents() {
  document.querySelectorAll("[data-open-composer]").forEach((button) => button.addEventListener("click", () => openComposer()));
  $("openComposer").addEventListener("click", () => openComposer());
  $("closeComposer").addEventListener("click", closeComposer);
  $("cancelCompose").addEventListener("click", closeComposer);
  $("cancelPreview").addEventListener("click", closeComposer);
  $("backToEdit").addEventListener("click", showComposeStep);
  $("previewPost").addEventListener("click", showPreviewStep);
  $("postForm").addEventListener("submit", publishDraft);
  $("composerDialog").addEventListener("close", () => { document.body.classList.remove("dialog-open"); });
  $("composerDialog").addEventListener("cancel", () => { resetComposer(); document.body.classList.remove("dialog-open"); });
  $("searchInput").addEventListener("input", renderFeed);
  $("sortSelect").addEventListener("change", renderFeed);
  document.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    if (window.location.hash.startsWith("#/post/")) window.location.hash = "#feed";
    else renderFeed();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
  document.querySelectorAll("[data-kind]").forEach((button) => button.addEventListener("click", () => {
    composerKind = button.dataset.kind;
    $("postKind").value = composerKind;
    document.querySelectorAll("[data-kind]").forEach((option) => option.classList.toggle("active", option === button));
  }));
  $("chooseCover").addEventListener("click", () => $("coverInput").click());
  $("coverInput").addEventListener("change", (event) => acceptCover(event.target.files?.[0]));
  $("addMediaButton").addEventListener("click", () => $("mediaInput").click());
  $("mediaInput").addEventListener("change", (event) => acceptMedia(event.target.files || []));
  $("addTopic").addEventListener("click", addTopic);
  $("topicInput").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); addTopic(); } });
  document.addEventListener("click", (event) => {
    const removeMediaButton = event.target.closest("[data-remove-media]");
    if (removeMediaButton) { composerMedia = composerMedia.filter((item) => item.id !== removeMediaButton.dataset.removeMedia); renderComposerMedia(); return; }
    const removeTopicButton = event.target.closest("[data-remove-topic]");
    if (removeTopicButton) { draftTopics.splice(Number(removeTopicButton.dataset.removeTopic), 1); renderDraftTopics(); return; }
    const editButton = event.target.closest("[data-edit-post]");
    if (editButton) { openComposer(editButton.dataset.editPost); return; }
    const deleteButton = event.target.closest("[data-delete-post]");
    if (deleteButton) { deletePost(deleteButton.dataset.deletePost); }
  });
  window.addEventListener("hashchange", route);
}

connectEvents();
if (!storageAvailable) $("storageStatus").textContent = "Armazenamento local indisponível: você pode navegar, mas não publicar neste protótipo.";
route();
