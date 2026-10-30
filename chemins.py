"""
Calcul des chemins des impulsions — « Ce qui nous relie ne fane pas »

On donne seulement quelques points à la main (la base du bouquet, les fleurs,
quelques extrémités de ramifications). Le script trouve lui-même le trajet
qui suit les traits dessinés entre ces points : c'est le chemin « le moins
coûteux », sachant que marcher sur l'encre coûte peu et sur le papier vide
coûte cher.

Entrée  : site/dessin.png (produit par detourage.py)
Sorties : site/reseau.js (chargé par la page)
          chemins_verification.png (les chemins superposés au dessin)

Lancer :  python chemins.py
Dépendances : pip install numpy pillow scikit-image matplotlib
"""

import json
import numpy as np
from PIL import Image
from skimage.graph import route_through_array
import matplotlib
import matplotlib.pyplot as plt

IMAGE = "site/dessin.png"
SORTIE = "site/reseau.js"

# Point de départ de toutes les impulsions : le pied du bouquet
BASE = (640, 1600)

# Les fleurs : nom -> centre (x, y) en pixels de dessin.png, taille du halo,
# et les extrémités de ramifications vers lesquelles l'impulsion peut se diffuser.
FLEURS = {
    "haut":   {"centre": (628, 318),  "rayon": 70, "ramifications": [(636, 48), (765, 105), (380, 372), (530, 400), (800, 318), (688, 508)]},
    "gauche": {"centre": (183, 553),  "rayon": 65, "ramifications": [(148, 305), (300, 325), (30, 555), (135, 785), (195, 770)]},
    "petite": {"centre": (335, 848),  "rayon": 55, "ramifications": [(183, 948), (348, 1088), (515, 808), (275, 712), (390, 692)]},
    "droite": {"centre": (1010, 548), "rayon": 75, "ramifications": [(1270, 535), (1085, 355), (1095, 740), (997, 700), (948, 415)]},
    "bouton1": {"centre": (448, 545), "rayon": 30, "ramifications": []},
    "bouton2": {"centre": (742, 580), "rayon": 30, "ramifications": []},
    "bas_droite": {"centre": (820, 958), "rayon": 35, "ramifications": [(928, 1018), (895, 1085)]},
    "bas_gauche": {"centre": (488, 1170), "rayon": 32, "ramifications": [(392, 1137), (392, 1220)]},
    "tige1": {"centre": (560, 518), "rayon": 22, "ramifications": []},
    "tige2": {"centre": (500, 605), "rayon": 22, "ramifications": []},
}

PAS = 4  # on garde un point tous les 4 pixels pour alléger le fichier


def charger_cout(chemin):
    alpha = np.asarray(Image.open(chemin))[..., 3].astype(np.float32) / 255.0
    # Faible coût sur l'encre, coût élevé sur le vide : le chemin colle aux traits
    # mais peut franchir une petite interruption du crayon.
    cout = 1.0 + 60.0 * (1.0 - alpha) ** 2
    return alpha, cout


def accrocher(point, alpha, rayon=14):
    """Déplace un point cliqué à la main sur le pixel d'encre le plus proche."""
    x, y = point
    h, w = alpha.shape
    y0, y1 = max(0, y - rayon), min(h, y + rayon + 1)
    x0, x1 = max(0, x - rayon), min(w, x + rayon + 1)
    zone = alpha[y0:y1, x0:x1]
    if zone.max() < 0.3:
        return point
    yy, xx = np.nonzero(zone >= 0.5 * zone.max())
    d = (xx + x0 - x) ** 2 + (yy + y0 - y) ** 2
    i = np.argmin(d)
    return (int(xx[i] + x0), int(yy[i] + y0))


def tracer(a, b, alpha, cout):
    a, b = accrocher(a, alpha), accrocher(b, alpha)
    trajet, _ = route_through_array(cout, (a[1], a[0]), (b[1], b[0]), fully_connected=True, geometric=True)
    points = [(int(c), int(r)) for r, c in trajet[::PAS]]
    if points[-1] != (b[0], b[1]):
        points.append((b[0], b[1]))
    return points


def main():
    alpha, cout = charger_cout(IMAGE)
    h, w = alpha.shape
    reseau = {"largeur": w, "hauteur": h, "base": list(BASE), "fleurs": []}

    for nom, f in FLEURS.items():
        tige = tracer(BASE, f["centre"], alpha, cout)
        ramifs = [tracer(f["centre"], bout, alpha, cout) for bout in f["ramifications"]]
        reseau["fleurs"].append({
            "nom": nom,
            "centre": list(f["centre"]),
            "rayon": f["rayon"],
            "tige": tige,
            "ramifications": ramifs,
        })
        print(f"{nom:12s} tige {len(tige):4d} points, {len(ramifs)} ramifications")

    with open(SORTIE, "w", encoding="utf-8") as fichier:
        fichier.write("// Généré par chemins.py — ne pas modifier à la main\n")
        fichier.write("window.RESEAU = " + json.dumps(reseau, separators=(",", ":")) + ";\n")

    # Vérification visuelle
    plt.figure(figsize=(8, 10.5))
    plt.imshow(alpha, cmap="gray")
    for f in reseau["fleurs"]:
        x, y = zip(*f["tige"])
        plt.plot(x, y, color="gold", lw=1.2)
        for r in f["ramifications"]:
            x, y = zip(*r)
            plt.plot(x, y, color="tomato", lw=1)
        plt.scatter(*f["centre"], s=f["rayon"] * 2, facecolors="none", edgecolors="cyan")
        plt.text(f["centre"][0] + 10, f["centre"][1] - 10, f["nom"], color="cyan", fontsize=8)
    plt.axis("off")
    plt.tight_layout()
    plt.savefig("chemins_verification.png", dpi=90)
    if matplotlib.get_backend().lower() != "agg":
        plt.show()
    print(f"Réseau écrit dans {SORTIE}")


if __name__ == "__main__":
    main()
