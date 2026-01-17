(() => {
  let albumVideoMap = {};
  let lastAlbumUri = null;
  let lastVideoUrl = null;
  let activeVideos = new Set();

  function createVideoElement(videoURL) {
    const video = document.createElement("video");
    video.src = videoURL;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.className = "animated-cover";
    video.currentTime = 0;

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
    "#Desktop_PanelContainer_Id .main-nowPlayingView-coverArtContainer img",
    ".main-nowPlayingView-coverArtContainer .DyIlapjoCthUuSOzmJGD img",
    ".main-nowPlayingView-coverArtContainer a > div > div",

    ".main-coverSlotExpanded-container img",
    "[data-testid='cover-art'] img:not(.main-nowPlayingBar-left *)",
    ".main-image-image.cover-art-image"
  ];

  function cleanupOldVideos() {
    const allVideos = document.querySelectorAll("video.animated-cover");
    allVideos.forEach(video => {
      if (!activeVideos.has(video)) {
        video.remove();
      }
    });
  }

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

    const videosToRemove = new Set(activeVideos);
    
    selectors.forEach((selector) => {
      let elements = document.querySelectorAll(selector);
      
      elements.forEach(element => {
        let coverContainer = element;

        if (coverContainer.tagName === 'IMG') {
          coverContainer = coverContainer.parentElement;
        }

        if (!coverContainer) return;

        const existingVideos = coverContainer.querySelectorAll("video.animated-cover");
        existingVideos.forEach(video => {
          activeVideos.delete(video);
          video.pause();
          video.src = '';
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

          videosToRemove.delete(video);
        } else {
          const originalImg = coverContainer.querySelector("img");
          if (originalImg) originalImg.style.visibility = "visible";
        }
      });
    });

    videosToRemove.forEach(video => {
      activeVideos.delete(video);
      video.pause();
      video.src = '';
      video.remove();
    });
  }

  function forceUpdate() {
    lastAlbumUri = null;
    lastVideoUrl = null;
    updateCover();
  }

  function startEverything() {
    setInterval(updateCover, 500);

    if (Spicetify?.Player?.updateState) {
      const originalUpdateState = Spicetify.Player.updateState;
      Spicetify.Player.updateState = function (...args) {
        const result = originalUpdateState.apply(this, args);
        setTimeout(forceUpdate, 100);
        return result;
      };
    }

    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const hasCover = node.querySelector && (
              node.querySelector('.main-nowPlayingView-coverArtContainer') ||
              node.classList.contains('main-nowPlayingView-coverArtContainer') ||
              node.classList.contains('main-coverSlotExpanded-container')
            );
            if (hasCover) shouldUpdate = true;
          }
        });
      });
      if (shouldUpdate) setTimeout(forceUpdate, 150);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(forceUpdate, 200);
      } else {
        activeVideos.forEach(video => video.pause());
      }
    });

    window.addEventListener('focus', () => {
      setTimeout(forceUpdate, 200);
    });

    setInterval(cleanupOldVideos, 5000);

    setInterval(() => {
      const hasNewCoverElements = selectors.some(selector => {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).some(element => {
          const container = element.tagName === 'IMG' ? element.parentElement : element;
          return container && !container.querySelector("video.animated-cover") && albumVideoMap[lastAlbumUri];
        });
      });
      if (hasNewCoverElements) forceUpdate();
    }, 2000);
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
