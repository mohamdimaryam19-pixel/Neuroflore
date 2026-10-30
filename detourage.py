"""
Détourage du dessin — « Ce qui nous relie ne fane pas »

Entrée : une photo du dessin (crayon ou feutre sur papier blanc).
Sorties (dans le dossier du site) :
  - dessin.png          : traits blanc cassé sur fond transparent (utilisé par la page)
  - dessin_inverse.png  : traits clairs sur fond noir (solution de secours)
  - verification.png    : comparaison des étapes, pour contrôler le résultat

Lancer :  python detourage.py
Dépendances :  pip install opencv-python numpy matplotlib pillow
"""

import cv2
import numpy as np
import matplotlib
import matplotlib.pyplot as plt
from PIL import Image

# ---------------------------------------------------------------
# RÉGLAGES — c'est ici qu'on adapte le script à une autre photo
# ---------------------------------------------------------------
CHEMIN_IMAGE = "dessin.jpg"
DOSSIER_SORTIE = "site/"

# Recadrage (x0, y0, x1, y1) en pixels de la photo d'origine.
# Mettre None pour garder toute l'image.
RECADRAGE = (330, 270, 1640, 1990)

# Zones à effacer après recadrage (x0, y0, x1, y1), par ex. un autre
# dessin qui dépasse sur la feuille. Liste vide si rien à effacer.
ZONES_A_EFFACER = [(1150, 0, 1310, 300)]

TAILLE_FOND = 61        # taille du flou qui estime l'éclairage du papier (impair)
SEUIL = 22              # au-dessus de cette « noirceur », un pixel est un trait (0-255)
AIRE_MIN = 40           # taches plus petites que ça (en pixels) supprimées
LARGEUR_EXPORT = 1400   # largeur finale de l'image pour le Web
COULEUR_TRAIT = (236, 229, 216)  # blanc cassé
# ---------------------------------------------------------------


def charger(chemin):
    image = cv2.imread(chemin)
    if image is None:
        raise FileNotFoundError(f"Image introuvable : {chemin}")
    return image


def corriger_eclairage(gris):
    """Divise l'image par une estimation floue du papier :
    les ombres et dégradés de lumière disparaissent, les traits restent."""
    # Une fermeture morphologique « efface » les traits fins avant le flou,
    # pour que l'estimation du fond ne soit pas assombrie par le dessin.
    noyau = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    papier = cv2.morphologyEx(gris, cv2.MORPH_CLOSE, noyau)
    papier = cv2.medianBlur(papier, TAILLE_FOND)
    normalise = cv2.divide(gris, papier, scale=255)
    return normalise, papier


def isoler_traits(normalise):
    """Renvoie la « noirceur » de chaque pixel et un masque binaire nettoyé."""
    noirceur = 255 - normalise
    noirceur = cv2.GaussianBlur(noirceur, (3, 3), 0)
    _, masque = cv2.threshold(noirceur, SEUIL, 255, cv2.THRESH_BINARY)

    # Suppression des petites taches isolées (grain du papier, poussières)
    n, etiquettes, stats, _ = cv2.connectedComponentsWithStats(masque, connectivity=8)
    propre = np.zeros_like(masque)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= AIRE_MIN:
            propre[etiquettes == i] = 255
    return noirceur, propre


def construire_alpha(noirceur, masque):
    """Transparence progressive : on garde le grain du crayon au lieu
    d'un trait binaire, pour que la main reste visible."""
    masque_large = cv2.dilate(masque, np.ones((3, 3), np.uint8))
    alpha = np.clip((noirceur.astype(np.float32) - SEUIL * 0.5) / 60.0, 0, 1)
    alpha = alpha ** 0.8 * (masque_large > 0)
    return (alpha * 255).astype(np.uint8)


def redimensionner(image):
    h, w = image.shape[:2]
    if w <= LARGEUR_EXPORT:
        return image
    ratio = LARGEUR_EXPORT / w
    return cv2.resize(image, (LARGEUR_EXPORT, int(h * ratio)), interpolation=cv2.INTER_AREA)


def main():
    image = charger(CHEMIN_IMAGE)
    if RECADRAGE:
        x0, y0, x1, y1 = RECADRAGE
        image = image[y0:y1, x0:x1]

    gris = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    normalise, papier = corriger_eclairage(gris)
    noirceur, masque = isoler_traits(normalise)

    for x0, y0, x1, y1 in ZONES_A_EFFACER:
        masque[y0:y1, x0:x1] = 0

    alpha = construire_alpha(noirceur, masque)
    alpha = redimensionner(alpha)
    h, w = alpha.shape

    # PNG transparent : couleur unie, la forme est portée par l'alpha
    rgba = np.zeros((h, w, 4), np.uint8)
    rgba[..., :3] = COULEUR_TRAIT
    rgba[..., 3] = alpha
    Image.fromarray(rgba, "RGBA").save(DOSSIER_SORTIE + "dessin.png")

    # Secours : traits clairs sur noir (à afficher avec mix-blend-mode: screen)
    inverse = (alpha[..., None] / 255.0 * np.array(COULEUR_TRAIT)).astype(np.uint8)
    Image.fromarray(inverse, "RGB").save(DOSSIER_SORTIE + "dessin_inverse.png")

    # Comparaison des étapes
    etapes = [
        (cv2.cvtColor(image, cv2.COLOR_BGR2RGB), "1. Photo recadrée"),
        (papier, "2. Éclairage estimé"),
        (normalise, "3. Éclairage corrigé"),
        (masque, "4. Traits isolés"),
        (inverse, "5. Résultat sur fond sombre"),
    ]
    fig, axes = plt.subplots(1, len(etapes), figsize=(22, 6))
    for ax, (img, titre) in zip(axes, etapes):
        ax.imshow(img, cmap="gray")
        ax.set_title(titre)
        ax.axis("off")
    plt.tight_layout()
    plt.savefig(DOSSIER_SORTIE + "../verification.png", dpi=80)
    if matplotlib.get_backend().lower() != "agg":
        plt.show()

    print(f"Terminé : dessin.png ({w}x{h}) et dessin_inverse.png dans {DOSSIER_SORTIE}")


if __name__ == "__main__":
    main()
