(() => {
  const albumVideoMap = {
    "spotify:album:3Ks0eeH0GWpY4AU20D5HPD": "https://realsafner.github.io/animated-covers/covers/Gemini-Rights-Steve-Lacy.webm", // Gemini Rights
    "spotify:album:6UXGi2ZR2aJ8JfXqnEaI3t": "https://realsafner.github.io/animated-covers/covers/Never-MogLo.webm", // Never
    "spotify:album:7wOOA7l306K8HfBKfPoafr": "https://realsafner.github.io/animated-covers/covers/in-utero-nirvana.webm", // In Utero
    "spotify:album:6Xo2PDEoQKzCndIbks2kvu": "https://realsafner.github.io/animated-covers/covers/lyfe-yeat.webm", // Lyfe
    "spotify:album:1xpGyKyV26uPstk1Elgp9Q": "https://realsafner.github.io/animated-covers/covers/weezer-weezer.webm", // Weezer
    "spotify:album:2UJcKiJxNryhL050F5Z1Fk": "https://realsafner.github.io/animated-covers/covers/nevermind-nirvana.webm", // Nevermind
    "spotify:album:5JpH5T1sCYnUyZD6TM0QaY": "https://realsafner.github.io/animated-covers/covers/cry-baby-melanie-martinez.webm", // Cry Baby
    "spotify:album:0fEO7g2c5onkaXsybEtuD2": "https://realsafner.github.io/animated-covers/covers/eternal-atake-deluxe-lil-uzi-vert.webm", // Eternal Atake
    "spotify:album:6tkjU4Umpo79wwkgPMV3nZ": "https://realsafner.github.io/animated-covers/covers/goodbye-n-good-riddance-juice-wrld.webm", // Goodbye & Good Riddance
    "spotify:album:5v9IfhMyxAkE9CbLjfNChR": "https://realsafner.github.io/animated-covers/covers/goodbye-n-good-riddance-juice-wrld.webm", // Goodbye & Good Riddance (5 y. ann.)
    "spotify:album:3cQO7jp5S9qLBoIVtbkSM1": "https://realsafner.github.io/animated-covers/covers/blurryface-twenty-one-pilots.webm", // Blurryface
    "spotify:album:6n9DKpOxwifT5hOXtgLZSL": "https://realsafner.github.io/animated-covers/covers/legends-never-die-jucie-wrld.webm", // Legends never die
  };

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

    // Sync all active videos to the global state
    activeVideos.forEach(video => {
      const videoUrl = video.src;
      if (globalVideoStates[videoUrl]) {
        const timeDiff = Math.abs(video.currentTime - globalVideoStates[videoUrl].currentTime);
        
        if (timeDiff > 0.5) {
          video.currentTime = globalVideoStates[videoUrl].currentTime;
        }
        
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
      if (globalVideoStates[videoURL]) {
        globalVideoStates[videoURL].isPlaying = true;
      }
    });

    video.addEventListener('pause', () => {
      if (globalVideoStates[videoURL]) {
        globalVideoStates[videoURL].isPlaying = false;
      }
    });

    video.onerror = () => {
      console.log('Failed to load video:', videoURL);
      activeVideos.delete(video);
      video.remove();
    };

    activeVideos.add(video);

    return video;
  }

  preloadVideos();

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
      if (existingVideo && existingVideo.src === videoURL) {
        return;
      }

      const existingVideos = coverContainer.querySelectorAll("video.animated-cover");
      existingVideos.forEach(video => {
        activeVideos.delete(video);
        video.remove();
      });

      if (videoURL) {
        const originalImg = coverContainer.querySelector("img");
        if (originalImg) {
          originalImg.style.visibility = "hidden";
        }

        const video = createVideoElement(videoURL);

        if (getComputedStyle(coverContainer).position === 'static') {
          coverContainer.style.position = "relative";
        }

        coverContainer.appendChild(video);
      } else {
        const originalImg = coverContainer.querySelector("img");
        if (originalImg) {
          originalImg.style.visibility = "visible";
        }
      }
    });
  }

  function forceUpdate() {
    lastAlbumUri = null;
    lastVideoUrl = null;
    updateCover();
  }

  setInterval(syncVideoStates, 100);
  setInterval(updateCover, 300);

  if (Spicetify?.Player?.updateState) {
    const originalUpdateState = Spicetify.Player.updateState;
    Spicetify.Player.updateState = function(...args) {
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
    
    if (shouldUpdate) {
      setTimeout(forceUpdate, 100);
    }
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      setTimeout(forceUpdate, 200);
    }
  });

  window.addEventListener('focus', () => {
    setTimeout(forceUpdate, 200);
  });

  setInterval(() => {
    const hasNewCoverElements = selectors.some(selector => {
      const element = document.querySelector(selector);
      return element && !element.querySelector("video.animated-cover") && albumVideoMap[lastAlbumUri];
    });
    
    if (hasNewCoverElements) {
      forceUpdate();
    }
  }, 1000);

  console.log("Improved animated covers loaded with video state sync and album-based mapping");
})();