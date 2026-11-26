/*
  All the content of the site lives in this file.

  SITE    — the name and short description shown at the top.
  SERIES  — each topic the group studies. A series has one or more sessions.

  Each session:
    number   — the session number inside its series
    title, summary
    bible / quran — the readings (leave a list empty if not used)
    image    — picture for the session list (16:9, e.g. 1280×720)
    poster   — picture shown on the video before it plays
    pdf      — PDF file in the pdfs/ folder
    videos   — one or more videos. Use a YouTube ID (the part after "youtu.be/")
               or a file in the videos/ folder. If both are filled, YouTube is used.
*/
window.SITE = {
  name: "Dialogue",
  tagline: "Christians and Muslims reading the Bible and the Qur’an side by side. Each session has a video and a PDF of the readings."
};

window.SERIES = [
  {
    id: "moses",
    title: "Moses in the Bible and the Qur’an",
    summary: "The life of Moses, read session by session in Exodus and in the Qur’an.",
    image: "assets/moses/series.jpg",
    sources: "Bible quotations: New International Version (NIV). Qur’an quotations: Ali Ünal, The Qur’an with Annotated Interpretation in Modern English.",
    sessions: [
      {
        number: 4,
        title: "Pharaoh, the Signs, and the Magicians",
        summary:
          "Moses and Aaron ask Pharaoh to let Israel go. Aaron's staff becomes a serpent, the plagues fall on Egypt, " +
          "the magicians are outdone, and Israel leaves after the Passover. The Qur'an tells the same confrontation, " +
          "with the shining hand and the magicians who come to faith.",
        bible: ["Exodus 5–12"],
        quran: ["Al-A’raf 7:103–135", "Ash-Shu’ara 26:10–51", "Ta-Ha 20:56–76"],
        image: "assets/moses/session4-card.jpg",
        poster: "assets/moses/session4-poster.jpg",
        pdf: "pdfs/moses/Moses_Session4_Pharaoh_and_the_Signs.pdf",
        pdfNote: "English and Turkish, side by side",
        videos: [
                    { label: "Narrated story", length: "13:36", youtube: "_iN_FknLsSY", file: "videos/moses/session4-narrated.mp4" },
          { label: "Short summary", length: "2:58", youtube: "Fkl6vPGUgEE", file: "videos/moses/session4-summary.mp4" }
        ]
      }
      /* Next session — remove the comment marks and fill in:
      ,{
        number: 5,
        title: "",
        summary: "",
        bible: [""],
        quran: [""],
        image: "assets/moses/session5-card.jpg",
        poster: "assets/moses/session5-poster.jpg",
        pdf: "pdfs/moses/Moses_Session5.pdf",
        pdfNote: "English and Turkish, side by side",
        videos: [ { label: "Narrated story", length: "", youtube: "", file: "" } ]
      }
      */
    ]
  }

  /* A new series — remove the comment marks and fill in:
  ,{
    id: "abraham",                     // short name used in the web address
    title: "Abraham in the Bible and the Qur’an",
    summary: "",
    image: "assets/abraham/series.jpg",
    sources: "",
    sessions: []
  }
  */
];
