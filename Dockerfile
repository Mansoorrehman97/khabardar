# Used by Hugging Face Spaces (Docker SDK). The app needs only the Python standard library.
FROM python:3.12-slim

RUN useradd -m -u 1000 user
USER user
WORKDIR /home/user/app
COPY --chown=user . .

ENV PORT=7860 PYTHONUNBUFFERED=1
EXPOSE 7860
CMD ["python", "server.py"]
