(() => {
  let albumVideoMap = {};

  let lastAlbumUri = null;
  let lastVideoUrl = null;
  let preloadedVideos = {};
  let globalVideoStates = {};
  let activeVideos = new Set();

  function preloadVideos() {
    const uniqueVideoUrls = [...new Set(Object.values(albumVideoMap))];

    uniqueVideoUrls.forEach(videoUrl => {
      if (!preloadedVideos[videoUrl]) {
        const video = document.createElement("video");
        video.src = videoUrl;
        video.preload = "auto";
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.style.display = "none";

        document.body.appendChild(video);
        preloadedVideos[videoUrl] = video;

        if (!globalVideoStates[videoUrl]) {
          globalVideoStates[videoUrl] = {
            currentTime: 0,
            isPlaying: false
          };
        }

        video.addEventListener('loadeddata', () => {
          video.currentTime = globalVideoStates[videoUrl].currentTime;
        });

        video.load();
        console.log(`Preloading video: ${videoUrl}`);
      }
    });
  }

  function syncVideoStates() {
    Object.keys(globalVideoStates).forEach(videoUrl => {
      const preloadedVideo = preloadedVideos[videoUrl];
      if (preloadedVideo && !preloadedVideo.paused) {
        globalVideoStates[videoUrl].currentTime = preloadedVideo.currentTime;
        globalVideoStates[videoUrl].isPlaying = true;
      }
    });

    activeVideos.forEach(video => {
      const videoUrl = video.src;
      if (globalVideoStates[videoUrl]) {
        const timeDiff = Math.abs(video.currentTime - globalVideoStates[videoUrl].currentTime);
        if (timeDiff > 0.5) video.currentTime = globalVideoStates[videoUrl].currentTime;
        if (globalVideoStates[videoUrl].isPlaying && video.paused) {
          video.play().catch(console.log);
        }
      }
    });
  }

  function createVideoElement(videoURL) {
    const video = document.createElement("video");
    video.src = videoURL;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.className = "animated-cover";

    Object.assign(video.style, {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      position: "absolute",
      top: "0",
      left: "0",
      zIndex: "1",
      borderRadius: "8px"
    });

    if (globalVideoStates[videoURL]) {
      video.currentTime = globalVideoStates[videoURL].currentTime;
    }

    video.addEventListener('loadeddata', () => {
      if (globalVideoStates[videoURL]) {
        video.currentTime = globalVideoStates[videoURL].currentTime;
        if (globalVideoStates[videoURL].isPlaying) {
          video.play().catch(console.log);
        }
      }
    });

    video.addEventListener('timeupdate', () => {
      if (!globalVideoStates[videoURL]) {
        globalVideoStates[videoURL] = { currentTime: 0, isPlaying: false };
      }
      globalVideoStates[videoURL].currentTime = video.currentTime;
      globalVideoStates[videoURL].isPlaying = !video.paused;
    });

    video.addEventListener('play', () => {
      if (globalVideoStates[videoURL]) globalVideoStates[videoURL].isPlaying = true;
    });

    video.addEventListener('pause', () => {
      if (globalVideoStates[videoURL]) globalVideoStates[videoURL].isPlaying = false;
    });

    video.onerror = () => {
      console.log('Failed to load video:', videoURL);
      activeVideos.delete(video);
      video.remove();
    };

    activeVideos.add(video);
    return video;
  }

  const selectors = [
    "#Desktop_PanelContainer_Id .main-nowPlayingView-coverArtContainer div.ylBRlfNqGnzVa4kjUQGP > div > a > div",
    "#main .cover-art-auto-height",
    "img.cover-art-image",
    ".main-trackInfo-container img",
    ".main-coverSlotExpanded-container img",
    "[data-testid='cover-art'] img"
  ];

  function updateCover() {
    const currentTrack = Spicetify?.Player?.data?.item;
    if (!currentTrack || !currentTrack.uri) return;

    const albumUri = currentTrack.album?.uri;
    if (!albumUri) return;

    const videoURL = albumVideoMap[albumUri];

    const albumChanged = albumUri !== lastAlbumUri;
    const videoUrlChanged = videoURL !== lastVideoUrl;

    if (!albumChanged && !videoUrlChanged) return;

    lastAlbumUri = albumUri;
    lastVideoUrl = videoURL;

    selectors.forEach((selector) => {
      let coverContainer = document.querySelector(selector);

      if (coverContainer && coverContainer.tagName === 'IMG') {
        coverContainer = coverContainer.parentElement;
      }

      if (!coverContainer) return;

      const existingVideo = coverContainer.querySelector("video.animated-cover");
      if (existingVideo && existingVideo.src === videoURL) return;

      const existingVideos = coverContainer.querySelectorAll("video.animated-cover");
      existingVideos.forEach(video => {
        activeVideos.delete(video);
        video.remove();
      });

      if (videoURL) {
        const originalImg = coverContainer.querySelector("img");
        if (originalImg) originalImg.style.visibility = "hidden";

        const video = createVideoElement(videoURL);

        if (getComputedStyle(coverContainer).position === 'static') {
          coverContainer.style.position = "relative";
        }

        coverContainer.appendChild(video);
      } else {
        const originalImg = coverContainer.querySelector("img");
        if (originalImg) originalImg.style.visibility = "visible";
      }
    });
  }

  function forceUpdate() {
    lastAlbumUri = null;
    lastVideoUrl = null;
    updateCover();
  }

  function startEverything() {
    preloadVideos();
    setInterval(syncVideoStates, 100);
    setInterval(updateCover, 300);

    if (Spicetify?.Player?.updateState) {
      const originalUpdateState = Spicetify.Player.updateState;
      Spicetify.Player.updateState = function (...args) {
        const result = originalUpdateState.apply(this, args);
        setTimeout(forceUpdate, 50);
        return result;
      };
    }

    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const hasCover = node.querySelector && (
              node.querySelector('img[src*="i.scdn.co"]') ||
              node.querySelector('[data-testid="cover-art"]') ||
              node.classList.contains('cover-art') ||
              node.classList.contains('main-coverSlotExpanded-container')
            );
            if (hasCover) shouldUpdate = true;
          }
        });
      });

      if (shouldUpdate) setTimeout(forceUpdate, 100);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) setTimeout(forceUpdate, 200);
    });

    window.addEventListener('focus', () => {
      setTimeout(forceUpdate, 200);
    });

    setInterval(() => {
      const hasNewCoverElements = selectors.some(selector => {
        const element = document.querySelector(selector);
        return element && !element.querySelector("video.animated-cover") && albumVideoMap[lastAlbumUri];
      });

      if (hasNewCoverElements) forceUpdate();
    }, 1000);
  }

  fetch("https://realsafner.github.io/animated-covers/albumVideoMap.json")
    .then(res => res.json())
    .then(data => {
      albumVideoMap = data;
      console.log("albumVideoMap is loaded!");
      startEverything();
    })
    .catch(err => {
      console.error("Loading error albumVideoMap:", err);
    });
})();
