import { useEffect, useRef } from 'react';

/**
 * Custom hook for confetti animation effect
 * Triggers when the provided condition becomes true
 */
export function useConfetti(trigger: boolean, canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const previousTriggerRef = useRef<boolean>(false);

  useEffect(() => {
    // Check if trigger just transitioned from false to true
    const justTriggered = trigger && !previousTriggerRef.current;
    previousTriggerRef.current = trigger;

    // Only trigger confetti when condition just became true
    if (!justTriggered) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    const confetti: Array<{
      x: number;
      y: number;
      r: number;
      d: number;
      color: string;
      tilt: number;
      tiltAngleIncrement: number;
      tiltAngle: number;
    }> = [];

    const confettiCount = 150;

    for (let i = 0; i < confettiCount; i++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * confettiCount,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleIncrement: Math.random() * 0.07 + 0.05,
        tiltAngle: Math.random() * Math.PI,
      });
    }

    let animationFrame: number;
    const startTime = Date.now();
    const confettiCreationDuration = 5000; // Stop creating new confetti after 5 seconds
    const maxAnimationDuration = 15000; // Maximum animation duration (15 seconds to let all fall)

    function draw() {
      if (!ctx || !canvas) return;

      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const stopCreatingNew = elapsed >= confettiCreationDuration;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let activeCount = 0;

      confetti.forEach((conf) => {
        // Check if confetti is still on screen
        const isOnScreen = conf.y <= canvas.height + conf.r && conf.x >= -conf.r && conf.x <= canvas.width + conf.r;

        if (isOnScreen) {
          activeCount++;

          ctx.beginPath();
          ctx.lineWidth = conf.r / 2;
          ctx.strokeStyle = conf.color;
          ctx.moveTo(conf.x + conf.tilt + conf.r, conf.y);
          ctx.lineTo(conf.x + conf.tilt, conf.y + conf.tilt + conf.r);
          ctx.stroke();

          conf.y += (Math.cos(conf.d) + 3 + conf.r / 2) / 2;
          conf.tiltAngle += conf.tiltAngleIncrement;
          conf.x += Math.sin(conf.d) * 2;
          conf.tilt = Math.sin(conf.tiltAngle - conf.r / 2) * 15;
        }

        // Only reset confetti if we're still in the creation phase and it's off screen
        if (!stopCreatingNew && !isOnScreen) {
          if (conf.y > canvas.height) {
            conf.x = Math.random() * canvas.width;
            conf.y = -conf.r;
            conf.tilt = Math.floor(Math.random() * 10) - 10;
            activeCount++;
          } else if (conf.x < -conf.r || conf.x > canvas.width + conf.r) {
            conf.x = Math.random() * canvas.width;
            conf.y = -conf.r;
            activeCount++;
          }
        }
      });

      // Continue animation until max duration or all confetti has fallen
      if (elapsed < maxAnimationDuration && activeCount > 0) {
        animationFrame = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Start animation after a short delay
    setTimeout(() => {
      draw();
    }, 100);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [trigger, canvasRef]);
}
