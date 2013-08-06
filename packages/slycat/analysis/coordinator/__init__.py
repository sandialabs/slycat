import logging

handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))

log = logging.getLogger("slycat.analysis.coordinator")
log.setLevel(logging.INFO)
log.addHandler(handler)

