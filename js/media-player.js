/* ==========================================================================
   HUGE INC. VIDEO & MEDIA CONTROLLER
   ========================================================================== */

const MediaPlayer = {
  init() {
    this.video = document.getElementById('heroShowreelVideo');
    this.playBtn = document.getElementById('playShowreelBtn');
    this.soundToggleBtn = document.getElementById('soundToggleBtn');
    this.modal = document.getElementById('videoModal');
    this.modalVideo = document.getElementById('modalVideo');
    this.openModalBtns = document.querySelectorAll('[data-open-showreel]');
    this.closeModalBtn = document.getElementById('closeVideoModalBtn');

    this.bindEvents();
  },

  bindEvents() {
    // Sound Toggle for Hero Banner Video
    if (this.soundToggleBtn && this.video) {
      this.soundToggleBtn.addEventListener('click', () => {
        this.video.muted = !this.video.muted;
        const icon = this.soundToggleBtn.querySelector('.sound-icon');
        if (icon) {
          icon.innerHTML = this.video.muted
            ? `<path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" fill="currentColor"/>`
            : `<path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" fill="currentColor"/>`;
        }
      });
    }

    // Open Lightbox Modal
    this.openModalBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal();
      });
    });

    // Close Lightbox Modal
    if (this.closeModalBtn) {
      this.closeModalBtn.addEventListener('click', () => this.closeModal());
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  },

  openModal() {
    if (!this.modal) return;
    this.modal.classList.add('is-active');
    document.body.style.overflow = 'hidden';
    if (this.modalVideo) {
      this.modalVideo.currentTime = 0;
      this.modalVideo.play();
    }
  },

  closeModal() {
    if (!this.modal) return;
    this.modal.classList.remove('is-active');
    document.body.style.overflow = '';
    if (this.modalVideo) {
      this.modalVideo.pause();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  MediaPlayer.init();
});
