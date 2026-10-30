"""
Séparation des têtes de fleurs — « Ce qui nous relie ne fane pas »

Pour qu'une fleur puisse pencher quand elle fane, il faut pouvoir la bouger
indépendamment du reste du bouquet. Ce script découpe chaque tête de fleur
dans le dessin, en suivant le trait du crayon :

  1. on coupe la tige juste sous la fleur (au « pivot ») ;
  2. on part du centre de la fleur et on remplit tout le trait qui y est
     relié (comme le pot de peinture d'un logiciel de dessin), sans dépasser
     la zone de la fleur ;
  3. ce qui a été rempli, c'est la tête : on l'enregistre à part et on
     l'efface du reste du dessin.

Entrée  : site/dessin.png et site/reseau.js
Sorties : site/dessin_base.png   (le bouquet sans les têtes)
          site/tete_<nom>.png    (une image par tête)
          site/tetes.js          (position de chaque tête et de son pivot)
          tetes_verification.png (chaque tête en couleur sur le bouquet)

Lancer : python separer_fleurs.py
"""

import json
import cv2
import numpy as np
from PIL import Image

SEUIL_ENCRE = 40     # au-dessus, un pixel fait partie du trait
EPAISSEUR = 5        # on épaissit le trait pour relier les petites coupures
COUPE = 40           # demi-longueur de la coupure, en travers de la tige


def lire_reseau():
    txt = open("site/reseau.js", encoding="utf-8").read()
    return json.loads(txt[txt.index("{"):txt.rindex("}") + 1])


def pivot_de(f):
    """Point de la tige, juste sous la fleur, autour duquel elle penchera,
    et direction de la tige à cet endroit."""
    cx, cy = f["centre"]
    t = f["tige"]
    k = 1
    for i in range(len(t) - 1, 0, -1):
        if np.hypot(t[i][0] - cx, t[i][1] - cy) >= f["rayon"]:
            k = i
            break
    a, b = np.array(t[max(0, k - 3)]), np.array(t[min(len(t) - 1, k + 3)])
    d = (b - a) / (np.linalg.norm(b - a) or 1)
    return [int(t[k][0]), int(t[k][1])], d


def portee_de(f):
    cx, cy = f["centre"]
    p = f["rayon"] * 1.6
    for r in f["ramifications"]:
        bx, by = r[-1]
        p = max(p, np.hypot(bx - cx, by - cy) + 25)
    return p


def main():
    rgba = np.array(Image.open("site/dessin.png"))
    alpha = rgba[..., 3]
    h, w = alpha.shape
    encre = (alpha > SEUIL_ENCRE).astype(np.uint8)
    encre_epaisse = cv2.dilate(encre, np.ones((EPAISSEUR, EPAISSEUR), np.uint8))
    reseau = lire_reseau()

    deja_pris = np.zeros((h, w), bool)
    base = rgba.copy()
    tetes = []
    verif = np.zeros((h, w, 3), np.uint8)
    verif[alpha > 0] = (90, 90, 90)
    couleurs = [(255, 190, 110), (255, 130, 150), (175, 150, 255), (110, 210, 215), (255, 155, 95), (215, 135, 235)]

    for i, f in enumerate(reseau["fleurs"]):
        cx, cy = f["centre"]
        pivot, direction = pivot_de(f)
        portee = portee_de(f)

        # Zone de travail : le disque de la fleur, moins une coupure sur la tige
        zone = np.zeros((h, w), np.uint8)
        cv2.circle(zone, (int(cx), int(cy)), int(portee), 1, -1)
        # coupure en travers de la tige, au pivot
        perp = np.array([-direction[1], direction[0]])
        a = tuple(int(v) for v in np.array(pivot) - perp * COUPE)
        b = tuple(int(v) for v in np.array(pivot) + perp * COUPE)
        cv2.line(zone, a, b, 0, 9)
        trait = encre_epaisse & zone & (~deja_pris).astype(np.uint8)

        # Remplissage : tout le trait relié au cœur de la fleur
        n, etiquettes = cv2.connectedComponents(trait, connectivity=8)
        coeur = np.zeros((h, w), np.uint8)
        cv2.circle(coeur, (int(cx), int(cy)), max(8, int(f["rayon"] * 0.8)), 1, -1)
        ids = set(np.unique(etiquettes[(coeur > 0) & (trait > 0)])) - {0}
        masque = np.isin(etiquettes, list(ids)) & (alpha > 0)
        deja_pris |= masque

        # Image de la tête, recadrée
        yy, xx = np.nonzero(masque)
        x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
        tete = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
        tete[masque[y0:y1, x0:x1]] = rgba[y0:y1, x0:x1][masque[y0:y1, x0:x1]]
        Image.fromarray(tete, "RGBA").save(f"site/tete_{f['nom']}.png")
        base[masque] = 0

        tetes.append({"nom": f["nom"], "fichier": f"tete_{f['nom']}.png",
                      "x": int(x0), "y": int(y0), "pivot": pivot})
        verif[masque] = couleurs[i % len(couleurs)]
        cv2.circle(verif, tuple(pivot), 6, (255, 255, 255), 2)
        print(f"{f['nom']:12s} tête de {int(masque.sum()):6d} pixels, pivot {pivot}")

    Image.fromarray(base, "RGBA").save("site/dessin_base.png")
    with open("site/tetes.js", "w", encoding="utf-8") as fichier:
        fichier.write("// Généré par separer_fleurs.py — ne pas modifier à la main\n")
        fichier.write("window.TETES = " + json.dumps(tetes, separators=(",", ":")) + ";\n")
    cv2.imwrite("tetes_verification.png", cv2.cvtColor(verif, cv2.COLOR_RGB2BGR))
    print("Têtes écrites dans site/tetes.js")


if __name__ == "__main__":
    main()
