import { useEffect, useState } from "react";
import "./App.css";
import { supabase } from "./lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

type ScreenState =
  | "arrival"
  | "lesson"
  | "discussion"
  | "timer";

type ClassName =
  | "worldHistory"
  | "usHistory"
  | "usGovernment"
  | "sociology"
  | "drama";

type Course = {
  name: string;
  bellRinger: string;
  slides: string;
  discussion: string;
};

type NowPlaying = {
  title: string;
  artist: string;
};

type HistoryMoment = {
  year: string;
  text: string;
};

type WikipediaOnThisDayItem = {
  year?: number;
  text?: string;
};

const classes: Record<ClassName, Course> = {
  worldHistory: {
    name: "World History",
    bellRinger: "What causes civilizations to rise, change, and fall?",
    slides:
      "https://docs.google.com/presentation/d/e/2PACX-1vRgslakriUyYQGy1msjc1zXR_TVxWwv-b8P93rjufV0kAs5FrdqpEXWAFBBqPuair9fCV-czPu5EVy6/pubembed?start=false&loop=false&delayms=3000",
    discussion:
      "Which matters more in shaping a civilization: its ideas, its institutions, or its people?",
  },

  usHistory: {
    name: "U.S. History",
    bellRinger: "How does the past continue to shape American life today?",
    slides: "",
    discussion:
      "How should Americans decide which parts of the nation's past deserve celebration, criticism, or both?",
  },

  usGovernment: {
    name: "U.S. Government",
    bellRinger: "What should the proper limits of government power be?",
    slides: "",
    discussion:
      "When should individual liberty outweigh the interests of the larger society?",
  },

  sociology: {
    name: "Sociology",
    bellRinger: "How much of your behavior is actually your own choice?",
    slides: "",
    discussion:
      "Does society shape people more than people shape society?",
  },

  drama: {
    name: "Drama",
    bellRinger: "What makes an audience believe a performance?",
    slides: "",
    discussion:
      "What makes a performance feel truthful even when the audience knows it is fictional?",
  },
};

const defaultBellRingers: Record<ClassName, string> = {
  worldHistory: classes.worldHistory.bellRinger,
  usHistory: classes.usHistory.bellRinger,
  usGovernment: classes.usGovernment.bellRinger,
  sociology: classes.sociology.bellRinger,
  drama: classes.drama.bellRinger,
};

const defaultSlides: Record<ClassName, string> = {
  worldHistory: classes.worldHistory.slides,
  usHistory: classes.usHistory.slides,
  usGovernment: classes.usGovernment.slides,
  sociology: classes.sociology.slides,
  drama: classes.drama.slides,
};

const defaultDiscussions: Record<ClassName, string> = {
  worldHistory: classes.worldHistory.discussion,
  usHistory: classes.usHistory.discussion,
  usGovernment: classes.usGovernment.discussion,
  sociology: classes.sociology.discussion,
  drama: classes.drama.discussion,
};

const defaultTicker =
  "QUIZ FRIDAY › BRING CHROMEBOOKS › DRAMA REHEARSAL 3:15 › HAVE YOUR BELL RINGER COMPLETE BEFORE CLASS BEGINS";

const defaultNowPlaying: NowPlaying = {
  title: "No track selected",
  artist: "Now Playing",
};

const defaultHistoryOverride: HistoryMoment = {
  year: "",
  text: "",
};

function normalizeGoogleSlidesUrl(input: string) {
  let url = input.trim();

  if (!url) {
    return "";
  }

  const iframeMatch = url.match(/src=["']([^"']+)["']/);

  if (iframeMatch) {
    url = iframeMatch[1];
  }

  if (url.includes("/pubembed") || url.includes("/embed")) {
    return url;
  }

  const presentationMatch = url.match(
    /docs\.google\.com\/presentation\/d\/([^/]+)/,
  );

  if (presentationMatch) {
    const presentationId = presentationMatch[1];

    return `https://docs.google.com/presentation/d/${presentationId}/embed?start=false&loop=false&delayms=3000`;
  }

  return url;
}

function App() {
  const [screenState, setScreenState] =
    useState<ScreenState>("arrival");

  const [currentClass, setCurrentClass] =
    useState<ClassName>("worldHistory");

  const [controlCenterOpen, setControlCenterOpen] =
    useState(false);

  const [loginOpen, setLoginOpen] =
    useState(false);

  const [session, setSession] =
    useState<Session | null>(null);

  const [timerSeconds, setTimerSeconds] =
    useState(10 * 60);

  const [timerRunning, setTimerRunning] =
    useState(false);

  const [timerEndAt, setTimerEndAt] =
    useState<number | null>(null);

  const [bellRingers, setBellRingers] = useState<
    Record<ClassName, string>
  >(() => {
    const saved = localStorage.getItem("classroomBellRingers");

    if (saved) {
      try {
        return {
          ...defaultBellRingers,
          ...JSON.parse(saved),
        };
      } catch {
        return defaultBellRingers;
      }
    }

    return defaultBellRingers;
  });

  const [slidesByClass, setSlidesByClass] = useState<
    Record<ClassName, string>
  >(() => {
    const saved = localStorage.getItem("classroomSlides");

    if (saved) {
      try {
        return {
          ...defaultSlides,
          ...JSON.parse(saved),
        };
      } catch {
        return defaultSlides;
      }
    }

    return defaultSlides;
  });

  const [discussionsByClass, setDiscussionsByClass] = useState<
    Record<ClassName, string>
  >(() => {
    const saved = localStorage.getItem("classroomDiscussions");

    if (saved) {
      try {
        return {
          ...defaultDiscussions,
          ...JSON.parse(saved),
        };
      } catch {
        return defaultDiscussions;
      }
    }

    return defaultDiscussions;
  });

  const [ticker, setTicker] = useState<string>(() => {
    return localStorage.getItem("classroomTicker") || defaultTicker;
  });

  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(() => {
    const saved = localStorage.getItem("classroomNowPlaying");

    if (saved) {
      try {
        return {
          ...defaultNowPlaying,
          ...JSON.parse(saved),
        };
      } catch {
        return defaultNowPlaying;
      }
    }

    return defaultNowPlaying;
  });

  const [automaticHistoryMoment, setAutomaticHistoryMoment] =
    useState<HistoryMoment>({
      year: "",
      text: "Loading today's history moment...",
    });

  const [historyOverride, setHistoryOverride] =
    useState<HistoryMoment>(() => {
      const saved = localStorage.getItem("classroomHistoryOverride");

      if (saved) {
        try {
          return {
            ...defaultHistoryOverride,
            ...JSON.parse(saved),
          };
        } catch {
          return defaultHistoryOverride;
        }
      }

      return defaultHistoryOverride;
    });

  useEffect(() => {
    localStorage.setItem(
      "classroomBellRingers",
      JSON.stringify(bellRingers),
    );
  }, [bellRingers]);

  useEffect(() => {
    localStorage.setItem(
      "classroomSlides",
      JSON.stringify(slidesByClass),
    );
  }, [slidesByClass]);

  useEffect(() => {
    localStorage.setItem(
      "classroomDiscussions",
      JSON.stringify(discussionsByClass),
    );
  }, [discussionsByClass]);

  useEffect(() => {
    localStorage.setItem("classroomTicker", ticker);
  }, [ticker]);

  useEffect(() => {
    localStorage.setItem(
      "classroomNowPlaying",
      JSON.stringify(nowPlaying),
    );
  }, [nowPlaying]);

  useEffect(() => {
    localStorage.setItem(
      "classroomHistoryOverride",
      JSON.stringify(historyOverride),
    );
  }, [historyOverride]);

  useEffect(() => {
    const today = new Date();

    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const dateKey = `${month}-${day}`;

    const cached = localStorage.getItem("classroomOnThisDayCache");

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          dateKey?: string;
          moment?: HistoryMoment;
        };

        if (
          parsed.dateKey === dateKey &&
          parsed.moment?.text
        ) {
          setAutomaticHistoryMoment(parsed.moment);
        }
      } catch {
        // Ignore a damaged cache and fetch a fresh event.
      }
    }

    async function loadHistoryMoment() {
      try {
        const response = await fetch(
          `https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${month}/${day}`,
        );

        if (!response.ok) {
          throw new Error("On This Day request failed");
        }

        const data = (await response.json()) as {
          selected?: WikipediaOnThisDayItem[];
        };

        const allEvents = (data.selected ?? []).filter(
          (event) =>
            typeof event.text === "string" &&
            event.text.trim().length > 0 &&
            typeof event.year === "number",
        );

        const sensitiveTerms = [
          "murder",
          "murdered",
          "massacre",
          "shooting",
          "suicide",
          "assassinated",
          "assassination",
          "execution",
          "bombing",
          "killed",
        ];

        const classroomFriendly = allEvents.filter((event) => {
          const eventText = event.text?.toLowerCase() ?? "";

          const isGraphic = sensitiveTerms.some((term) =>
            eventText.includes(term),
          );

          const isVeryRecent =
            typeof event.year === "number" && event.year > 2000;

          return !isGraphic && !isVeryRecent;
        });

        const candidates =
          classroomFriendly.length > 0
            ? classroomFriendly
            : allEvents;

        const chosen = candidates[0];

        if (!chosen || !chosen.text) {
          throw new Error("No On This Day events returned");
        }

        const moment: HistoryMoment = {
          year: String(chosen.year ?? ""),
          text: chosen.text,
        };

        setAutomaticHistoryMoment(moment);

        localStorage.setItem(
          "classroomOnThisDayCache",
          JSON.stringify({
            dateKey,
            moment,
          }),
        );
      } catch {
        setAutomaticHistoryMoment((current) => {
          if (
            current.text &&
            current.text !== "Loading today's history moment..."
          ) {
            return current;
          }

          return {
            year: "",
            text: "History moment unavailable. Check your connection or add an override in Setup.",
          };
        });
      }
    }

    loadHistoryMoment();
  }, []);

  useEffect(() => {
    if (!timerRunning || timerEndAt === null) {
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil((timerEndAt - Date.now()) / 1000),
      );

      setTimerSeconds(remaining);

      if (remaining === 0) {
        setTimerRunning(false);
        setTimerEndAt(null);
      }
    };

    updateTimer();

    const interval = window.setInterval(updateTimer, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [timerRunning, timerEndAt]);

  function startTimer() {
    if (timerSeconds <= 0) {
      return;
    }

    setTimerEndAt(Date.now() + timerSeconds * 1000);
    setTimerRunning(true);
  }

  function pauseTimer() {
    if (timerEndAt !== null) {
      const remaining = Math.max(
        0,
        Math.ceil((timerEndAt - Date.now()) / 1000),
      );

      setTimerSeconds(remaining);
    }

    setTimerRunning(false);
    setTimerEndAt(null);
  }

  function setTimerMinutes(minutes: number) {
    setTimerRunning(false);
    setTimerEndAt(null);
    setTimerSeconds(Math.max(0, minutes * 60));
  }

  function adjustTimerMinutes(change: number) {
    setTimerRunning(false);
    setTimerEndAt(null);
    setTimerSeconds((previous) =>
      Math.max(0, previous + change * 60),
    );
  }

  function resetTimer() {
    setTimerRunning(false);
    setTimerEndAt(null);
    setTimerSeconds(10 * 60);
  }

  const displayedHistoryMoment: HistoryMoment =
    historyOverride.text.trim()
      ? historyOverride
      : automaticHistoryMoment;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  function openSetup() {
    if (session) {
      setControlCenterOpen(true);
      return;
    }

    setLoginOpen(true);
  }

useEffect(() => {
  async function loadSharedClassroomData() {
    // --------------------------------
    // LOAD CLASS-SPECIFIC CONTENT
    // --------------------------------

    const {
      data: classRows,
      error: classError,
    } = await supabase
      .from("class_content")
      .select(
        "class_id, bell_ringer, slides_url, discussion_prompt"
      );

    if (classError) {
      console.error(
        "Could not load class content:",
        classError
      );
    } else if (classRows) {
      const nextBellRingers = {
        ...defaultBellRingers,
      };

      const nextSlides = {
        ...defaultSlides,
      };

      const nextDiscussions = {
        ...defaultDiscussions,
      };

      classRows.forEach((row) => {
        const classId =
          row.class_id as ClassName;

        if (classId in classes) {
          nextBellRingers[classId] =
            row.bell_ringer ?? "";

          nextSlides[classId] =
            row.slides_url ?? "";

          nextDiscussions[classId] =
            row.discussion_prompt ?? "";
        }
      });

      setBellRingers(nextBellRingers);
      setSlidesByClass(nextSlides);
      setDiscussionsByClass(nextDiscussions);
    }

    // --------------------------------
    // LOAD ROOM-WIDE DISPLAY SETTINGS
    // --------------------------------

    const {
      data: displayRow,
      error: displayError,
    } = await supabase
      .from("display_settings")
      .select(
        `
        ticker,
        now_playing_title,
        now_playing_artist,
        history_override_year,
        history_override_text
        `
      )
      .eq("id", "main")
      .single();

    if (displayError) {
      console.error(
        "Could not load display settings:",
        displayError
      );
    } else if (displayRow) {
      setTicker(displayRow.ticker ?? "");

      setNowPlaying({
        title:
          displayRow.now_playing_title ?? "",
        artist:
          displayRow.now_playing_artist ?? "",
      });

      setHistoryOverride({
        year:
          displayRow.history_override_year ?? "",
        text:
          displayRow.history_override_text ?? "",
      });
    }
  }

  loadSharedClassroomData();
}, []);

    const course: Course = {
    ...classes[currentClass],
    bellRinger: bellRingers[currentClass],
    slides: slidesByClass[currentClass],
    discussion: discussionsByClass[currentClass],
  };

  return (
    <main className="app">
      {screenState === "arrival" && (
        <ArrivalScreen
          course={course}
          ticker={ticker}
          nowPlaying={nowPlaying}
          historyMoment={displayedHistoryMoment}
          startLesson={() => setScreenState("lesson")}
        />
      )}

      {screenState === "lesson" && (
        <LessonScreen
          slides={course.slides}
          exitLesson={() => setScreenState("arrival")}
        />
      )}

      {screenState === "discussion" && (
        <DiscussionScreen prompt={course.discussion} />
      )}

      {screenState === "timer" && (
        <TimerScreen
          seconds={timerSeconds}
          running={timerRunning}
          start={startTimer}
          pause={pauseTimer}
          reset={resetTimer}
          setMinutes={setTimerMinutes}
          adjustMinutes={adjustTimerMinutes}
        />
      )}

      {screenState !== "lesson" && (
        <TeacherControls
          currentClass={currentClass}
          changeClass={setCurrentClass}
          changeScreen={setScreenState}
          openControlCenter={openSetup}
        />
      )}

      {controlCenterOpen && (
        <ControlCenter
          currentClass={currentClass}
          changeClass={setCurrentClass}
          bellRinger={bellRingers[currentClass]}
          slides={slidesByClass[currentClass]}
          discussion={discussionsByClass[currentClass]}
          ticker={ticker}
          nowPlaying={nowPlaying}
          automaticHistoryMoment={automaticHistoryMoment}
          historyOverride={historyOverride}
          close={() => setControlCenterOpen(false)}
          save={async (
            bellRinger,
            slides,
            discussion,
            newTicker,
            newNowPlaying,
            newHistoryOverride,
          ) => {
            if (!session) {
              setControlCenterOpen(false);
              setLoginOpen(true);
              return false;
            }

            const cleanBellRinger = bellRinger.trim();
            const cleanSlides = normalizeGoogleSlidesUrl(slides);
            const cleanDiscussion = discussion.trim();
            const cleanTicker = newTicker.trim();
            const cleanNowPlaying = {
              title: newNowPlaying.title.trim(),
              artist: newNowPlaying.artist.trim(),
            };
            const cleanHistoryOverride = {
              year: newHistoryOverride.year.trim(),
              text: newHistoryOverride.text.trim(),
            };
            const updatedAt = new Date().toISOString();

            const [classResult, displayResult] = await Promise.all([
              supabase
                .from("class_content")
                .update({
                  bell_ringer: cleanBellRinger,
                  slides_url: cleanSlides,
                  discussion_prompt: cleanDiscussion,
                  updated_at: updatedAt,
                })
                .eq("class_id", currentClass)
                .select("class_id")
                .single(),

              supabase
                .from("display_settings")
                .update({
                  ticker: cleanTicker,
                  now_playing_title: cleanNowPlaying.title,
                  now_playing_artist: cleanNowPlaying.artist,
                  history_override_year: cleanHistoryOverride.year,
                  history_override_text: cleanHistoryOverride.text,
                  updated_at: updatedAt,
                })
                .eq("id", "main")
                .select("id")
                .single(),
            ]);

            if (classResult.error || displayResult.error) {
              console.error("Class save error:", classResult.error);
              console.error("Display save error:", displayResult.error);
              window.alert(
                "The classroom changes could not be saved. Check your Supabase permissions and try again.",
              );
              return false;
            }

            setBellRingers((previous) => ({
              ...previous,
              [currentClass]: cleanBellRinger,
            }));

            setSlidesByClass((previous) => ({
              ...previous,
              [currentClass]: cleanSlides,
            }));

            setDiscussionsByClass((previous) => ({
              ...previous,
              [currentClass]: cleanDiscussion,
            }));

            setTicker(cleanTicker);
            setNowPlaying(cleanNowPlaying);
            setHistoryOverride(cleanHistoryOverride);

            setControlCenterOpen(false);
            return true;
          }}
        />
      )}

      {loginOpen && (
        <LoginModal
          close={() => setLoginOpen(false)}
          success={() => {
            setLoginOpen(false);
            setControlCenterOpen(true);
          }}
        />
      )}
    </main>
  );
}

/* -------------------------------- */
/* ARRIVAL SCREEN                   */
/* -------------------------------- */

function ArrivalScreen({
  course,
  ticker,
  nowPlaying,
  historyMoment,
  startLesson,
}: {
  course: Course;
  ticker: string;
  nowPlaying: NowPlaying;
  historyMoment: HistoryMoment;
  startLesson: () => void;
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const time = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const weekday = now.toLocaleDateString([], {
    weekday: "long",
  });

  const month = now.toLocaleDateString([], {
    month: "long",
  });

  const day = now.getDate();

  return (
    <section className="arrival">
      <aside className="infoRail">
        <div className="classHeader">
          <span>{course.name}</span>
          <span>{time}</span>
        </div>

        <div className="dateBlock">
          <small>TODAY IS</small>
          <h2>{weekday}</h2>
          <h1>{month}</h1>
          <h1>{day}</h1>
        </div>

        <div className="historyMoment">
          <small>ON THIS DAY</small>

          <p className="historyMomentText">
            {historyMoment.year && (
              <strong className="historyMomentYear">
                {historyMoment.year}
              </strong>
            )}

            <span>
              {historyMoment.text}
            </span>
          </p>

          <span className="historyMomentSource">
            SOURCE • WIKIPEDIA
          </span>
        </div>

        <div className="music">
          <small>NOW PLAYING</small>
          <p>
            <strong>{nowPlaying.title || "No track selected"}</strong>
            <br />
            {nowPlaying.artist || "—"}
          </p>
        </div>
      </aside>

      <section className="bellRinger">
        <small>BELL RINGER</small>
        <h1>{course.bellRinger}</h1>

        <button onClick={startLesson}>
          START LESSON →
        </button>
      </section>

      <div className="ticker">
        <div className="tickerText">
          {ticker || "No announcements"}
          &nbsp; › &nbsp;
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- */
/* LESSON SCREEN                    */
/* -------------------------------- */

function LessonScreen({
  slides,
  exitLesson,
}: {
  slides: string;
  exitLesson: () => void;
}) {
  return (
    <section className="lessonScreen">
      {slides ? (
        <iframe
          src={slides}
          className="slides"
          title="Lesson Slides"
          allowFullScreen
        />
      ) : (
        <section className="simpleScreen">
          <small>LESSON</small>
          <h1>No Google Slides link has been added for this class.</h1>
        </section>
      )}

      <button
        className="exitLesson"
        onClick={exitLesson}
        aria-label="Exit lesson"
      >
        ×
      </button>
    </section>
  );
}

/* -------------------------------- */
/* DISCUSSION SCREEN                */
/* -------------------------------- */

function DiscussionScreen({
  prompt,
}: {
  prompt: string;
}) {
  return (
    <section className="simpleScreen">
      <small>DISCUSSION</small>

      <h1>
        {prompt || "No discussion prompt has been added for this class."}
      </h1>
    </section>
  );
}

/* -------------------------------- */
/* TIMER SCREEN                     */
/* -------------------------------- */

function TimerScreen({
  seconds,
  running,
  start,
  pause,
  reset,
  setMinutes,
  adjustMinutes,
}: {
  seconds: number;
  running: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  setMinutes: (minutes: number) => void;
  adjustMinutes: (change: number) => void;
}) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const displayTime =
    `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;

  return (
    <section
      className={`timerScreen ${seconds === 0 ? "timerFinished" : ""}`}
    >
      <small>
        {seconds === 0
          ? "TIME"
          : running
            ? "TIME REMAINING"
            : "TIMER READY"}
      </small>

      <div className="timerDisplay">
        {displayTime}
      </div>

      <div className="timerPresets">
        {[5, 10, 15, 20].map((minutesPreset) => (
          <button
            key={minutesPreset}
            onClick={() => setMinutes(minutesPreset)}
          >
            {minutesPreset} MIN
          </button>
        ))}
      </div>

      <div className="timerControls">
        <button
          onClick={() => adjustMinutes(-1)}
          aria-label="Subtract one minute"
        >
          − 1 MIN
        </button>

        <button
          className="timerPrimary"
          onClick={running ? pause : start}
          disabled={!running && seconds === 0}
        >
          {running ? "PAUSE" : "START"}
        </button>

        <button onClick={reset}>
          RESET
        </button>

        <button
          onClick={() => adjustMinutes(1)}
          aria-label="Add one minute"
        >
          + 1 MIN
        </button>
      </div>

      {seconds === 0 && (
        <div className="timerDone">
          TIME'S UP
        </div>
      )}
    </section>
  );
}

/* -------------------------------- */
/* TEACHER CONTROLS                 */
/* -------------------------------- */

function TeacherControls({
  currentClass,
  changeClass,
  changeScreen,
  openControlCenter,
}: {
  currentClass: ClassName;
  changeClass: (course: ClassName) => void;
  changeScreen: (screen: ScreenState) => void;
  openControlCenter: () => void;
}) {
  const [open, setOpen] = useState(false);

  function goTo(screen: ScreenState) {
    changeScreen(screen);
    setOpen(false);
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }

      setOpen(false);
    } catch (error) {
      console.error("Fullscreen failed:", error);
    }
  }

  return (
    <div className="teacherPanel">
      {open && (
        <nav className="teacherControls">
          <select
            value={currentClass}
            onChange={(event) =>
              changeClass(event.target.value as ClassName)
            }
          >
            <option value="worldHistory">World History</option>
            <option value="usHistory">U.S. History</option>
            <option value="usGovernment">U.S. Government</option>
            <option value="sociology">Sociology</option>
            <option value="drama">Drama</option>
          </select>

          <button onClick={() => goTo("arrival")}>
            Arrival
          </button>

          <button onClick={() => goTo("lesson")}>
            Lesson
          </button>

          <button onClick={() => goTo("discussion")}>
            Discussion
          </button>

          <button onClick={() => goTo("timer")}>
            Timer
          </button>

          <button onClick={toggleFullscreen}>
            ⛶ Fullscreen
          </button>

          <button
            className="setupButton"
            onClick={() => {
              setOpen(false);
              openControlCenter();
            }}
          >
            ⚙ Setup
          </button>
        </nav>
      )}

      <button
        className="teacherToggle"
        onClick={() => setOpen(!open)}
        aria-label="Toggle teacher controls"
      >
        C
      </button>
    </div>
  );
}

/* -------------------------------- */
/* LOGIN                            */
/* -------------------------------- */

function LoginModal({
  close,
  success,
}: {
  close: () => void;
  success: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function signIn() {
    if (!email.trim() || !password) {
      setErrorMessage("Enter your email and password.");
      return;
    }

    setWorking(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setWorking(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    success();
  }

  return (
    <div
      className="controlCenterBackdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <section
        className="authCard"
        role="dialog"
        aria-modal="true"
        aria-label="Teacher Login"
      >
        <header className="authHeader">
          <div>
            <small>CEPHAS CLASSROOM</small>
            <h2>Teacher Login</h2>
          </div>

          <button
            className="controlCenterClose"
            onClick={close}
            aria-label="Close login"
          >
            ×
          </button>
        </header>

        <div className="authBody">
          <p className="authIntro">
            Sign in to edit classroom content.
          </p>

          <label htmlFor="teacher-email">EMAIL</label>
          <input
            id="teacher-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />

          <label htmlFor="teacher-password">PASSWORD</label>
          <input
            id="teacher-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !working) {
                void signIn();
              }
            }}
            autoComplete="current-password"
            placeholder="Password"
          />

          {errorMessage && (
            <p className="authError">{errorMessage}</p>
          )}
        </div>

        <footer className="controlCenterFooter">
          <button
            className="controlCancel"
            onClick={close}
            disabled={working}
          >
            Cancel
          </button>

          <button
            className="controlSave"
            onClick={() => void signIn()}
            disabled={working}
          >
            {working ? "SIGNING IN..." : "SIGN IN"}
          </button>
        </footer>
      </section>
    </div>
  );
}

/* -------------------------------- */
/* CONTROL CENTER                   */
/* -------------------------------- */

function ControlCenter({
  currentClass,
  changeClass,
  bellRinger,
  slides,
  discussion,
  ticker,
  nowPlaying,
  automaticHistoryMoment,
  historyOverride,
  close,
  save,
}: {
  currentClass: ClassName;
  changeClass: (course: ClassName) => void;
  bellRinger: string;
  slides: string;
  discussion: string;
  ticker: string;
  nowPlaying: NowPlaying;
  automaticHistoryMoment: HistoryMoment;
  historyOverride: HistoryMoment;
  close: () => void;
  save: (
    bellRinger: string,
    slides: string,
    discussion: string,
    ticker: string,
    nowPlaying: NowPlaying,
    historyOverride: HistoryMoment,
  ) => Promise<boolean>;
}) {
  const [bellRingerDraft, setBellRingerDraft] =
    useState(bellRinger);

  const [slidesDraft, setSlidesDraft] =
    useState(slides);

  const [discussionDraft, setDiscussionDraft] =
    useState(discussion);

  const [tickerDraft, setTickerDraft] =
    useState(ticker);

  const [nowPlayingTitleDraft, setNowPlayingTitleDraft] =
    useState(nowPlaying.title);

  const [nowPlayingArtistDraft, setNowPlayingArtistDraft] =
    useState(nowPlaying.artist);

  const [historyYearDraft, setHistoryYearDraft] =
    useState(historyOverride.year);

  const [historyTextDraft, setHistoryTextDraft] =
    useState(historyOverride.text);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    setBellRingerDraft(bellRinger);
    setSlidesDraft(slides);
    setDiscussionDraft(discussion);
    setTickerDraft(ticker);
    setNowPlayingTitleDraft(nowPlaying.title);
    setNowPlayingArtistDraft(nowPlaying.artist);
    setHistoryYearDraft(historyOverride.year);
    setHistoryTextDraft(historyOverride.text);
  }, [
    bellRinger,
    slides,
    discussion,
    ticker,
    nowPlaying.title,
    nowPlaying.artist,
    historyOverride.year,
    historyOverride.text,
    currentClass,
  ]);

  return (
    <div
      className="controlCenterBackdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <section
        className="controlCenter"
        role="dialog"
        aria-modal="true"
        aria-label="Classroom Control Center"
      >
        <header className="controlCenterHeader">
          <div>
            <small>CEPHAS CLASSROOM</small>
            <h2>Control Center</h2>
          </div>

          <button
            className="controlCenterClose"
            onClick={close}
            aria-label="Close control center"
          >
            ×
          </button>
        </header>

        <div className="controlCenterClass">
          <label htmlFor="setup-class">
            CLASS
          </label>

          <select
            id="setup-class"
            value={currentClass}
            onChange={(event) =>
              changeClass(event.target.value as ClassName)
            }
          >
            <option value="worldHistory">World History</option>
            <option value="usHistory">U.S. History</option>
            <option value="usGovernment">U.S. Government</option>
            <option value="sociology">Sociology</option>
            <option value="drama">Drama</option>
          </select>
        </div>

        <div className="controlCenterBody">
          <div className="controlSectionHeading">
            <small>DAILY CONTENT</small>
          </div>

          <div className="controlGroup">
            <label htmlFor="bell-ringer">
              Bell Ringer
            </label>

            <textarea
              id="bell-ringer"
              value={bellRingerDraft}
              onChange={(event) =>
                setBellRingerDraft(event.target.value)
              }
              placeholder="Enter today's Bell Ringer..."
            />
          </div>

          <div className="controlGroup">
            <label htmlFor="lesson-slides">
              Lesson Slides
            </label>

            <textarea
              id="lesson-slides"
              className="slidesUrlInput"
              value={slidesDraft}
              onChange={(event) =>
                setSlidesDraft(event.target.value)
              }
              placeholder="Paste a Google Slides link or iframe code..."
            />

            <p className="controlHint">
              Normal Google Slides links, embed links, and iframe code all work.
            </p>
          </div>

          <div className="controlGroup">
            <label htmlFor="discussion-prompt">
              Discussion Prompt
            </label>

            <textarea
              id="discussion-prompt"
              value={discussionDraft}
              onChange={(event) =>
                setDiscussionDraft(event.target.value)
              }
              placeholder="Enter the discussion question or claim..."
            />

            <p className="controlHint">
              This appears full-screen when you choose Discussion from the C menu.
            </p>
          </div>

          <div className="controlSectionHeading controlSectionSpacing">
            <small>DISPLAY</small>
          </div>

          <div className="controlGroup">
            <label htmlFor="ticker">
              Ticker
            </label>

            <textarea
              id="ticker"
              value={tickerDraft}
              onChange={(event) =>
                setTickerDraft(event.target.value)
              }
              placeholder="Quiz Friday › Bring Chromebooks › ..."
            />

            <p className="controlHint">
              Use › between announcements if you want the broadcast-style separator.
            </p>
          </div>

          <div className="controlGroup">
            <label>
              Now Playing
            </label>

            <div className="nowPlayingEditor">
              <input
                type="text"
                value={nowPlayingTitleDraft}
                onChange={(event) =>
                  setNowPlayingTitleDraft(event.target.value)
                }
                placeholder="Song title"
              />

              <input
                type="text"
                value={nowPlayingArtistDraft}
                onChange={(event) =>
                  setNowPlayingArtistDraft(event.target.value)
                }
                placeholder="Artist"
              />
            </div>

            <p className="controlHint">
              Display only for now — your music can keep playing from whatever app you already use.
            </p>
          </div>

          <div className="controlGroup">
            <label>
              On This Day
            </label>

            <div className="historyAutoPreview">
              <small>AUTOMATIC</small>

              <p>
                {automaticHistoryMoment.year && (
                  <strong>
                    {automaticHistoryMoment.year}
                  </strong>
                )}
                {automaticHistoryMoment.year && " — "}
                {automaticHistoryMoment.text}
              </p>
            </div>

            <div className="historyOverrideEditor">
              <input
                type="text"
                value={historyYearDraft}
                onChange={(event) =>
                  setHistoryYearDraft(event.target.value)
                }
                placeholder="Year"
              />

              <textarea
                value={historyTextDraft}
                onChange={(event) =>
                  setHistoryTextDraft(event.target.value)
                }
                placeholder="Optional custom history moment..."
              />
            </div>

            <p className="controlHint">
              Leave the custom event blank to use the automatic daily Wikipedia event.
            </p>
          </div>
        </div>

        <footer className="controlCenterFooter">
          <button
            className="controlCancel"
            onClick={close}
          >
            Cancel
          </button>

          <button
            className="controlSave"
            disabled={saving}
            onClick={async () => {
              setSaving(true);

              const saved = await save(
                bellRingerDraft,
                slidesDraft,
                discussionDraft,
                tickerDraft,
                {
                  title: nowPlayingTitleDraft,
                  artist: nowPlayingArtistDraft,
                },
                {
                  year: historyYearDraft,
                  text: historyTextDraft,
                },
              );

              if (!saved) {
                setSaving(false);
              }
            }}
          >
            {saving ? "SAVING..." : "Save All"}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default App;
