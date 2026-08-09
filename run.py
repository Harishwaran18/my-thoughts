from app.routes import app, ADMIN_USERNAME, ADMIN_PASSWORD
from app import db

import datetime  # noqa: F401, E402


@app.context_processor
def inject_year():
    return {"now_year": datetime.datetime.now().year}


def seed():
    with app.app_context():
        if db.get_all_posts():
            print("Posts already exist, skipping seed.")
            return
        db.create_post(
            "Welcome to my blog",
            "# Hello there!\n\nThis is my personal space on the web where I "
            "share my **thoughts**, *ideas*, and experiences.\n\n"
            "I built this blog to have a quiet corner to write freely. "
            "Feel free to look around.\n\n"
            "## What you'll find here\n\n"
            "- Personal reflections\n"
            "- Things I'm learning\n"
            "- Random musings\n\n"
            "> Writing is thinking on paper.\n\n"
            "Thanks for stopping by!",
            "welcome, personal",
        )
        db.create_post(
            "On starting small",
            "Every big thing starts small. This blog, this post, even this "
            "sentence.\n\nThe hardest part is always the beginning. But once "
            "you start, momentum builds.\n\n```python\n"
            "def start():\n"
            "    return 'just begin'\n"
            "```\n\nDon't overthink it. Just write.",
            "thoughts, motivation",
        )
        print("Seeded sample posts.")


if __name__ == "__main__":
    seed()
    print(f"Admin login: {ADMIN_USERNAME} / {ADMIN_PASSWORD}")
    app.run(host="0.0.0.0", port=5000, debug=True)
