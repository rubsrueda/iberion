# Flujo seguro de trabajo con Copilot

## 1. Guardar un punto seguro (commit automático)
Cada vez que confirmes que el juego funciona, ejecuta este comando en la terminal para guardar el estado actual:

    git add .
    git commit -m "Punto seguro: juego funcional antes de cambios Copilot"

Puedes copiar y pegar esto en la terminal integrada de VS Code.

---

## 2. Revertir al último estado funcional
Si algo se rompe, puedes volver al último commit seguro con:

    git log --oneline

Busca el commit con el mensaje "Punto seguro: juego funcional..." y copia el hash (por ejemplo, `eb2de53`). Luego ejecuta:

    git reset --hard <hash>

Ejemplo:

    git reset --hard eb2de53

---

## 3. Recomendación
- Haz un commit de punto seguro ANTES de cada cambio grande o después de confirmar que todo funciona.
- Si tienes dudas, pide a Copilot que haga el commit por ti antes de modificar algo.
- Si necesitas automatizar aún más, puedo crearte un script para hacer backup y commit con un solo comando.

---

¿Quieres que te cree un script para automatizar este flujo (por ejemplo, "backup-copilot.bat")?
