<?php

namespace Graphp\Algorithms;

use Graphp\Algorithms\BaseGraph;
use Fhaculty\Graph\Graph;
use Graphp\Algorithms\Degree;

class Eulerian extends BaseGraph
{
    /**
     * check whether this graph has an eulerian cycle
     *
     * @return boolean
     * @uses ConnectedComponents::isSingle()
     * @uses Degree::getDegreeVertex()
     * @todo isolated vertices should be ignored
     * @todo definition is only valid for undirected graphs
     */
    public function hasCycle()
    {
        $components = new ConnectedComponents($this->graph);
        if ($components->isSingle()) {
            $alg = new Degree($this->graph);

            foreach ($this->graph->getVertices() as $vertex) {
                // uneven degree => fail
                if ($alg->getDegreeVertex($vertex) & 1) {
                    return false;
                }
            }

            return true;
        }

        return false;
    }
}
